import { Prisma } from "@/lib/prisma/client";
import { db } from "@/lib/prisma/db";
import { getAvailableStock, getStockStatus } from "@/lib/inventory/stock";
import type {
  InventoryMovementRow,
  InventoryProductRow,
  InventorySort,
  InventoryStatusFilter,
  InventorySummary,
} from "@/lib/inventory/types";

export type {
  InventoryMovementRow,
  InventoryProductRow,
  InventorySort,
  InventoryStatusFilter,
  InventorySummary,
} from "@/lib/inventory/types";

export type InventoryQueryInput = {
  companyId: string;
  q?: string;
  status?: InventoryStatusFilter;
  warehouseId?: string;
  unitId?: string;
  sort?: InventorySort;
  page?: number;
  pageSize?: number;
};

function num(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function normalizeSort(sort?: string): InventorySort {
  switch (sort) {
    case "oldest":
      return "oldest";
    case "price":
    case "price_desc":
      return "price_desc";
    case "price_asc":
      return "price_asc";
    case "name":
      return "name";
    case "stock_high":
      return "stock_high";
    case "stock_low":
      return "stock_low";
    case "newest":
    default:
      return "newest";
  }
}

function normalizeStatus(status?: string): InventoryStatusFilter {
  if (status === "available" || status === "low" || status === "out") {
    return status;
  }
  return "all";
}

/** Product IDs matching stock status via SQL column compare (efficient). */
async function idsForStockStatus(
  companyId: string,
  status: Exclude<InventoryStatusFilter, "all">
): Promise<string[]> {
  if (status === "out") {
    const rows = await db.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Product"
      WHERE "companyId" = ${companyId}
        AND "currentStock"::numeric <= 0
    `;
    return rows.map((r) => r.id);
  }

  if (status === "low") {
    const rows = await db.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Product"
      WHERE "companyId" = ${companyId}
        AND "currentStock"::numeric > 0
        AND "currentStock"::numeric <= "minimumStock"::numeric
    `;
    return rows.map((r) => r.id);
  }

  // available = in stock (above minimum) AND available qty > 0
  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Product"
    WHERE "companyId" = ${companyId}
      AND "currentStock"::numeric > 0
      AND "currentStock"::numeric > "minimumStock"::numeric
      AND ("currentStock"::numeric - "reservedStock"::numeric) > 0
  `;
  return rows.map((r) => r.id);
}

async function productIdsForWarehouse(
  companyId: string,
  warehouseId: string
): Promise<string[]> {
  const rows = await db.warehouseStock.findMany({
    where: { companyId, warehouseId },
    select: { productId: true },
  });
  return rows.map((r) => r.productId);
}

function orderByForSort(
  sort: InventorySort
): Prisma.ProductOrderByWithRelationInput {
  switch (sort) {
    case "oldest":
      return { createdAt: "asc" };
    case "price_asc":
      return { salePrice: "asc" };
    case "price":
    case "price_desc":
      return { salePrice: "desc" };
    case "name":
      return { name: "asc" };
    case "stock_high":
      return { currentStock: "desc" };
    case "stock_low":
      return { currentStock: "asc" };
    case "newest":
    default:
      return { createdAt: "desc" };
  }
}

export async function buildInventorySummary(
  companyId: string
): Promise<InventorySummary> {
  const [counts, totals] = await Promise.all([
    db.$queryRaw<
      Array<{
        productsCount: bigint;
        availableCount: bigint;
        lowStockCount: bigint;
        outOfStockCount: bigint;
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
        )::bigint AS "outOfStockCount"
      FROM "Product"
      WHERE "companyId" = ${companyId}
    `,
    db.product.aggregate({
      where: { companyId },
      _sum: {
        currentStock: true,
        reservedStock: true,
      },
    }),
  ]);

  const row = counts[0];
  const totalCurrent = num(totals._sum.currentStock);
  const totalReserved = num(totals._sum.reservedStock);

  return {
    productsCount: Number(row?.productsCount ?? 0),
    availableCount: Number(row?.availableCount ?? 0),
    lowStockCount: Number(row?.lowStockCount ?? 0),
    outOfStockCount: Number(row?.outOfStockCount ?? 0),
    totalCurrent,
    totalAvailable: Math.max(0, totalCurrent - totalReserved),
    totalReserved,
  };
}

export async function queryInventory(input: InventoryQueryInput) {
  const companyId = input.companyId;
  const q = (input.q || "").trim();
  const status = normalizeStatus(input.status);
  const sort = normalizeSort(input.sort);
  const page = Math.max(1, input.page || 1);
  const pageSize = Math.min(48, Math.max(1, input.pageSize || 20));
  const warehouseId = input.warehouseId?.trim() || "";
  const unitId = input.unitId?.trim() || "";

  const where: Prisma.ProductWhereInput = { companyId };

  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { sku: { contains: q, mode: "insensitive" } },
      { barcode: { contains: q, mode: "insensitive" } },
    ];
  }

  if (unitId) {
    where.unitId = unitId;
  }

  if (status !== "all") {
    const ids = await idsForStockStatus(companyId, status);
    if (ids.length === 0) {
      where.id = { in: [] };
    } else {
      where.id = { in: ids };
    }
  }

  if (warehouseId) {
    const ids = await productIdsForWarehouse(companyId, warehouseId);
    if (ids.length === 0) {
      where.id = { in: [] };
    } else if (where.id && typeof where.id === "object" && "in" in where.id) {
      const set = new Set(ids);
      where.id = {
        in: (where.id.in as string[]).filter((id) => set.has(id)),
      };
    } else {
      where.id = { in: ids };
    }
  }

  const [total, products, mainWarehouse, movements, summary] =
    await Promise.all([
      db.product.count({ where }),
      db.product.findMany({
        where,
        select: {
          id: true,
          name: true,
          sku: true,
          barcode: true,
          image: true,
          currentStock: true,
          reservedStock: true,
          minimumStock: true,
          maximumStock: true,
          purchasePrice: true,
          salePrice: true,
          active: true,
          createdAt: true,
          unit: { select: { id: true, name: true, symbol: true } },
        },
        orderBy: orderByForSort(sort),
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.warehouse.findFirst({
        where: { companyId },
        orderBy: [{ isMain: "desc" }, { createdAt: "asc" }],
        select: { name: true },
      }),
      db.inventoryTransaction.findMany({
        where: {
          companyId,
          ...(warehouseId ? { warehouseId } : {}),
        },
        select: {
          id: true,
          type: true,
          quantity: true,
          previousQty: true,
          newQty: true,
          reason: true,
          referenceNo: true,
          createdAt: true,
          product: { select: { id: true, name: true, sku: true } },
          warehouse: { select: { id: true, name: true, code: true } },
          user: { select: { id: true, fullName: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      buildInventorySummary(companyId),
    ]);

  const warehouseName = mainWarehouse?.name || "کۆگا";

  const rows: InventoryProductRow[] = products.map((p) => {
    const currentStock = num(p.currentStock);
    const reservedStock = num(p.reservedStock);
    const minimumStock = num(p.minimumStock);
    const maximumStock = num(p.maximumStock);
    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      barcode: p.barcode,
      image: p.image,
      currentStock,
      reservedStock,
      availableStock: getAvailableStock(currentStock, reservedStock),
      minimumStock,
      maximumStock,
      purchasePrice: num(p.purchasePrice),
      salePrice: num(p.salePrice),
      active: p.active,
      createdAt: p.createdAt.toISOString(),
      unit: p.unit,
      warehouseName,
      status: getStockStatus(currentStock, minimumStock),
    };
  });

  const movementRows: InventoryMovementRow[] = movements.map((m) => ({
    id: m.id,
    type: m.type,
    quantity: num(m.quantity),
    previousQty: m.previousQty == null ? null : num(m.previousQty),
    newQty: m.newQty == null ? null : num(m.newQty),
    reason: m.reason,
    referenceNo: m.referenceNo,
    createdAt: m.createdAt.toISOString(),
    product: m.product,
    warehouse: m.warehouse,
    userName: m.user?.fullName ?? null,
  }));

  return {
    products: rows,
    movements: movementRows,
    summary,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

export async function loadInventoryFilterOptions(companyId: string) {
  const [units, warehouses] = await Promise.all([
    db.unit.findMany({
      where: { companyId },
      select: { id: true, name: true, symbol: true },
      orderBy: { name: "asc" },
    }),
    db.warehouse.findMany({
      where: { companyId },
      select: { id: true, name: true, code: true, isMain: true },
      orderBy: [{ isMain: "desc" }, { name: "asc" }],
    }),
  ]);

  return { units, warehouses };
}
