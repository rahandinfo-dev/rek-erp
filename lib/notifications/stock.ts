import { db } from "@/lib/prisma/db";
import { createNotification } from "@/lib/notifications/create";
import {
  getAvailableStock,
  getStockStatus,
  type StockStatus,
} from "@/lib/inventory/stock";

export type StockAlertKind =
  | "OUT_OF_STOCK"
  | "LOW_STOCK"
  | "AT_MINIMUM"
  | "WAREHOUSE_LOW"
  | "WAREHOUSE_CAPACITY";

export type InventoryAlertResult = {
  kind: StockAlertKind;
  productId: string | null;
  productName: string | null;
  title: string;
  message: string;
  notificationId: string | null;
  created: boolean;
};

function startOfUtcDay(d = new Date()) {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  );
}

function num(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function alertKey(entityType: string, entityId: string, kind: string) {
  return `${entityType}:${entityId}:${kind}`;
}

/** Distinct alert kinds for a product based on configurable minimumStock. */
export function resolveStockAlertKind(
  currentStock: unknown,
  minimumStock: unknown
): Exclude<StockAlertKind, "WAREHOUSE_LOW" | "WAREHOUSE_CAPACITY"> | null {
  const current = num(currentStock);
  const minimum = Math.max(0, num(minimumStock));

  if (current <= 0) return "OUT_OF_STOCK";
  if (minimum > 0 && current === minimum) return "AT_MINIMUM";
  if (current > 0 && current < minimum) return "LOW_STOCK";
  return null;
}

async function loadTodaysAlertKeys(companyId: string, since: Date) {
  const rows = await db.notification.findMany({
    where: {
      companyId,
      deletedAt: null,
      createdAt: { gte: since },
      category: { in: ["INVENTORY", "WARNING", "WAREHOUSE"] },
      entityId: { not: null },
    },
    select: {
      id: true,
      entityType: true,
      entityId: true,
      metadata: true,
    },
  });

  const map = new Map<string, string>();
  for (const row of rows) {
    if (!row.entityType || !row.entityId) continue;
    const meta =
      row.metadata &&
      typeof row.metadata === "object" &&
      !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : null;
    const kind = typeof meta?.kind === "string" ? meta.kind : null;
    if (!kind) continue;
    map.set(alertKey(row.entityType, row.entityId, kind), row.id);
  }
  return map;
}

async function createStockAlert(
  input: {
    companyId: string;
    kind: StockAlertKind;
    title: string;
    message: string;
    href: string;
    entityType: string;
    entityId: string;
    priority: "HIGH" | "CRITICAL";
    category: "INVENTORY" | "WARNING" | "WAREHOUSE";
    metadata: Record<string, unknown>;
  },
  existingKeys: Map<string, string>
): Promise<InventoryAlertResult> {
  const key = alertKey(input.entityType, input.entityId, input.kind);
  const existingId = existingKeys.get(key);

  if (existingId) {
    return {
      kind: input.kind,
      productId: input.entityType === "Product" ? input.entityId : null,
      productName: null,
      title: input.title,
      message: input.message,
      notificationId: existingId,
      created: false,
    };
  }

  const notification = await createNotification({
    companyId: input.companyId,
    title: input.title,
    message: input.message,
    category: input.category,
    priority: input.priority,
    href: input.href,
    entityType: input.entityType,
    entityId: input.entityId,
    metadata: {
      ...input.metadata,
      kind: input.kind,
    },
  });

  if (notification?.id) {
    existingKeys.set(key, notification.id);
  }

  return {
    kind: input.kind,
    productId: input.entityType === "Product" ? input.entityId : null,
    productName: null,
    title: input.title,
    message: input.message,
    notificationId: notification?.id ?? null,
    created: Boolean(notification),
  };
}

async function createProductAlert(
  companyId: string,
  product: { id: string; name: string; sku: string },
  kind: Exclude<StockAlertKind, "WAREHOUSE_LOW" | "WAREHOUSE_CAPACITY">,
  qty: { stock: number; min: number; available: number; reserved: number },
  existingKeys: Map<string, string>,
  warehouseName = "کۆگا"
): Promise<InventoryAlertResult> {
  const configs = {
    OUT_OF_STOCK: {
      title: "کۆگا تەواو بوو",
      message: `${product.name} · ماوە: ${qty.stock} · ${warehouseName}`,
      priority: "CRITICAL" as const,
      category: "INVENTORY" as const,
    },
    LOW_STOCK: {
      title: "کۆگای کەم",
      message: `${product.name} · ماوە: ${qty.stock} · ${warehouseName}`,
      priority: "HIGH" as const,
      category: "WARNING" as const,
    },
    AT_MINIMUM: {
      title: "گەیشتە ئاگاداری کۆگا",
      message: `${product.name} · ماوە: ${qty.stock} · ${warehouseName}`,
      priority: "HIGH" as const,
      category: "INVENTORY" as const,
    },
  }[kind];

  const result = await createStockAlert(
    {
      companyId,
      kind,
      title: configs.title,
      message: configs.message,
      href: `/dashboard/products/${product.id}`,
      entityType: "Product",
      entityId: product.id,
      priority: configs.priority,
      category: configs.category,
      metadata: {
        productName: product.name,
        remainingQuantity: qty.stock,
        warehouseName,
        timestamp: new Date().toISOString(),
        stock: qty.stock,
        availableStock: qty.available,
        reservedStock: qty.reserved,
        minimumStock: qty.min,
        status: getStockStatus(qty.stock, qty.min) as StockStatus,
      },
    },
    existingKeys
  );

  return { ...result, productName: product.name };
}

/**
 * Notify for specific products after stock-affecting mutations.
 */
export async function notifyStockLevels(
  companyId: string,
  productIds: string[]
): Promise<InventoryAlertResult[]> {
  const uniqueIds = [...new Set(productIds.filter(Boolean))];
  if (uniqueIds.length === 0) return [];

  const since = startOfUtcDay();
  const [products, existingKeys, warehouseRows] = await Promise.all([
    db.product.findMany({
      where: { companyId, id: { in: uniqueIds } },
      select: {
        id: true,
        name: true,
        sku: true,
        currentStock: true,
        reservedStock: true,
        minimumStock: true,
      },
    }),
    loadTodaysAlertKeys(companyId, since),
    db.warehouseStock.findMany({
      where: { companyId, productId: { in: uniqueIds } },
      select: {
        productId: true,
        quantity: true,
        warehouse: { select: { name: true, isMain: true } },
      },
      orderBy: { warehouse: { isMain: "desc" } },
    }),
  ]);

  const warehouseByProduct = new Map<string, string>();
  for (const row of warehouseRows) {
    if (!warehouseByProduct.has(row.productId)) {
      warehouseByProduct.set(row.productId, row.warehouse.name);
    }
  }

  const results: InventoryAlertResult[] = [];

  for (const product of products) {
    const stock = num(product.currentStock);
    const min = num(product.minimumStock);
    const reserved = num(product.reservedStock);
    const available = getAvailableStock(stock, reserved);
    const kind = resolveStockAlertKind(stock, min);
    if (!kind) continue;

    const warehouseName = warehouseByProduct.get(product.id) || "کۆگا";
    const alert = await createProductAlert(
      companyId,
      product,
      kind,
      { stock, min, available, reserved },
      existingKeys,
      warehouseName
    );
    results.push(alert);
  }

  return results;
}

/**
 * Scan only at-risk products (SQL-filtered) + one batch of today's alerts.
 */
export async function runInventoryAlerts(
  companyId: string
): Promise<InventoryAlertResult[]> {
  const since = startOfUtcDay();

  const [counts, alertProducts, existingKeys, mainWarehouse] =
    await Promise.all([
      db.$queryRaw<
        Array<{
          productsCount: bigint;
          availableCount: bigint;
          lowStockCount: bigint;
          outOfStockCount: bigint;
          atMinimumCount: bigint;
          availableTotal: unknown;
        }>
      >`
        SELECT
          COUNT(*)::bigint AS "productsCount",
          COUNT(*) FILTER (
            WHERE "currentStock"::numeric > 0
              AND "currentStock"::numeric > "minimumStock"::numeric
              AND ("currentStock"::numeric - "reservedStock"::numeric) > 0
          )::bigint AS "availableCount",
          COUNT(*) FILTER (
            WHERE "currentStock"::numeric > 0
              AND "currentStock"::numeric <= "minimumStock"::numeric
          )::bigint AS "lowStockCount",
          COUNT(*) FILTER (
            WHERE "currentStock"::numeric <= 0
          )::bigint AS "outOfStockCount",
          COUNT(*) FILTER (
            WHERE "minimumStock"::numeric > 0
              AND "currentStock"::numeric = "minimumStock"::numeric
          )::bigint AS "atMinimumCount",
          COALESCE(SUM(GREATEST("currentStock"::numeric - "reservedStock"::numeric, 0)), 0) AS "availableTotal"
        FROM "Product"
        WHERE "companyId" = ${companyId}
          AND active = true
      `,
      db.$queryRaw<
        Array<{
          id: string;
          name: string;
          sku: string;
          currentStock: unknown;
          reservedStock: unknown;
          minimumStock: unknown;
        }>
      >`
        SELECT id, name, sku, "currentStock", "reservedStock", "minimumStock"
        FROM "Product"
        WHERE "companyId" = ${companyId}
          AND active = true
          AND (
            "currentStock"::numeric <= 0
            OR (
              "minimumStock"::numeric > 0
              AND "currentStock"::numeric > 0
              AND "currentStock"::numeric <= "minimumStock"::numeric
            )
          )
        ORDER BY "currentStock"::numeric ASC
        LIMIT 200
      `,
      loadTodaysAlertKeys(companyId, since),
      db.warehouse.findFirst({
        where: { companyId },
        orderBy: [{ isMain: "desc" }, { createdAt: "asc" }],
        select: { id: true, name: true, capacity: true },
      }),
    ]);

  const row = counts[0];
  const total = Number(row?.productsCount ?? 0);
  const lowCount = Number(row?.lowStockCount ?? 0);
  const outCount = Number(row?.outOfStockCount ?? 0);
  const atMinCount = Number(row?.atMinimumCount ?? 0);
  const availableTotal = num(row?.availableTotal);

  const results: InventoryAlertResult[] = [];

  for (const product of alertProducts) {
    const stock = num(product.currentStock);
    const min = num(product.minimumStock);
    const reserved = num(product.reservedStock);
    const available = getAvailableStock(stock, reserved);
    const kind = resolveStockAlertKind(stock, min);
    if (!kind) continue;

    const alert = await createProductAlert(
      companyId,
      product,
      kind,
      { stock, min, available, reserved },
      existingKeys,
      mainWarehouse?.name || "کۆگا"
    );
    results.push(alert);
  }

  const problemCount = lowCount + outCount;
  const problemRatio = total > 0 ? problemCount / total : 0;
  const warehouseLow =
    total > 0 &&
    (outCount >= 1 ||
      lowCount >= 3 ||
      problemRatio >= 0.15 ||
      (atMinCount >= 2 && availableTotal <= lowCount + outCount));

  if (warehouseLow) {
    const entityId = mainWarehouse?.id || companyId;
    const warehouseName = mainWarehouse?.name || "کۆگا";

    const warehouseAlert = await createStockAlert(
      {
        companyId,
        kind: "WAREHOUSE_LOW",
        title: "کۆگا — کۆگای کەم",
        message: `${warehouseName}: ${outCount} تەواو · ${lowCount} کەم · ${atMinCount} لە کەمترین بڕ. کۆی بەردەست: ${availableTotal.toLocaleString()}.`,
        href: "/dashboard/werehouse",
        entityType: "Warehouse",
        entityId,
        priority: outCount > 0 ? "CRITICAL" : "HIGH",
        category: "WAREHOUSE",
        metadata: {
          lowStockCount: lowCount,
          outOfStockCount: outCount,
          atMinimumCount: atMinCount,
          availableStock: availableTotal,
          productsCount: total,
          warehouseName,
        },
      },
      existingKeys
    );

    results.push({
      ...warehouseAlert,
      productName: warehouseName,
    });

    const capacity =
      mainWarehouse?.capacity != null ? num(mainWarehouse.capacity) : 0;
    if (capacity > 0) {
      const used = availableTotal;
      const pct = (used / capacity) * 100;
      if (pct >= 85) {
        const capAlert = await createStockAlert(
          {
            companyId,
            kind: "WAREHOUSE_CAPACITY",
            title: "ئاگاداری توانای کۆگا",
            message: `${warehouseName}: ${Math.round(pct)}% پڕە (${used.toLocaleString()} / ${capacity.toLocaleString()}).`,
            href: "/dashboard/werehouse",
            entityType: "Warehouse",
            entityId,
            priority: pct >= 95 ? "CRITICAL" : "HIGH",
            category: "WAREHOUSE",
            metadata: {
              capacityPct: pct,
              used,
              capacity,
            },
          },
          existingKeys
        );
        results.push({
          ...capAlert,
          productName: warehouseName,
        });
      }
    }
  }

  return results;
}
