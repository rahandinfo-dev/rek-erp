import { db } from "@/lib/prisma/db";

function num(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export type InventoryValuation = {
  inventoryValue: number;
  purchaseValue: number;
  salesValue: number;
  averageCost: number;
  currentAssetValue: number;
  productsCount: number;
  totalUnits: number;
};

export type WarehouseValuation = InventoryValuation & {
  warehouseId: string;
  warehouseName: string;
  capacity: number | null;
  usedUnits: number;
  availableUnits: number;
  capacityPct: number | null;
  availableCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  inventoryHealthScore: number;
};

/**
 * Company-wide inventory valuation via SQL aggregates (no full product scan).
 */
export async function buildInventoryValuation(
  companyId: string
): Promise<InventoryValuation> {
  const rows = await db.$queryRaw<
    Array<{
      productsCount: bigint;
      totalUnits: unknown;
      inventoryValue: unknown;
      purchaseValue: unknown;
      salesValue: unknown;
    }>
  >`
    SELECT
      COUNT(*)::bigint AS "productsCount",
      COALESCE(SUM("currentStock"::numeric), 0) AS "totalUnits",
      COALESCE(
        SUM(
          "currentStock"::numeric
          * COALESCE(
              NULLIF("costPrice"::numeric, 0),
              "purchasePrice"::numeric,
              0
            )
        ),
        0
      ) AS "inventoryValue",
      COALESCE(
        SUM(
          "currentStock"::numeric
          * COALESCE(
              NULLIF("purchasePrice"::numeric, 0),
              "costPrice"::numeric,
              0
            )
        ),
        0
      ) AS "purchaseValue",
      COALESCE(SUM("currentStock"::numeric * "salePrice"::numeric), 0) AS "salesValue"
    FROM "Product"
    WHERE "companyId" = ${companyId}
      AND active = true
      AND "deletedAt" IS NULL
  `;

  const row = rows[0];
  const totalUnits = num(row?.totalUnits);
  const inventoryValue = num(row?.inventoryValue);
  const purchaseValue = num(row?.purchaseValue);
  const salesValue = num(row?.salesValue);
  const averageCost = totalUnits > 0 ? inventoryValue / totalUnits : 0;

  return {
    inventoryValue: Math.round(inventoryValue * 100) / 100,
    purchaseValue: Math.round(purchaseValue * 100) / 100,
    salesValue: Math.round(salesValue * 100) / 100,
    averageCost: Math.round(averageCost * 100) / 100,
    currentAssetValue: Math.round(inventoryValue * 100) / 100,
    productsCount: Number(row?.productsCount ?? 0),
    totalUnits,
  };
}

/**
 * Warehouse valuation using WarehouseStock balances + product costs.
 */
export async function buildWarehouseValuation(
  companyId: string,
  warehouseId: string
): Promise<WarehouseValuation | null> {
  const warehouse = await db.warehouse.findFirst({
    where: { id: warehouseId, companyId },
    select: { id: true, name: true, capacity: true },
  });
  if (!warehouse) return null;

  const all = await buildAllWarehouseValuations(companyId);
  return all.find((w) => w.warehouseId === warehouseId) ?? emptyWarehouseValuation(warehouse);
}

function emptyWarehouseValuation(warehouse: {
  id: string;
  name: string;
  capacity: unknown;
}): WarehouseValuation {
  const capacity = warehouse.capacity != null ? num(warehouse.capacity) : null;
  return {
    warehouseId: warehouse.id,
    warehouseName: warehouse.name,
    capacity,
    usedUnits: 0,
    availableUnits: 0,
    capacityPct: capacity != null && capacity > 0 ? 0 : null,
    availableCount: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    inventoryHealthScore: 100,
    inventoryValue: 0,
    purchaseValue: 0,
    salesValue: 0,
    averageCost: 0,
    currentAssetValue: 0,
    productsCount: 0,
    totalUnits: 0,
  };
}

/**
 * Per-warehouse metrics for all warehouses in a company (single grouped query).
 */
export async function buildAllWarehouseValuations(
  companyId: string
): Promise<WarehouseValuation[]> {
  const warehouses = await db.warehouse.findMany({
    where: { companyId },
    select: { id: true, name: true, capacity: true, isMain: true, code: true, address: true, createdAt: true },
    orderBy: [{ isMain: "desc" }, { name: "asc" }],
  });

  if (warehouses.length === 0) return [];

  const rows = await db.$queryRaw<
    Array<{
      warehouseId: string;
      productsCount: bigint;
      usedUnits: unknown;
      availableUnits: unknown;
      inventoryValue: unknown;
      purchaseValue: unknown;
      salesValue: unknown;
      availableCount: bigint;
      lowStockCount: bigint;
      outOfStockCount: bigint;
    }>
  >`
    SELECT
      ws."warehouseId" AS "warehouseId",
      COUNT(*) FILTER (WHERE p.active)::bigint AS "productsCount",
      COALESCE(SUM(ws.quantity::numeric) FILTER (WHERE p.active), 0) AS "usedUnits",
      COALESCE(
        SUM(
          GREATEST(ws.quantity::numeric - ws.reserved::numeric, 0)
        ) FILTER (WHERE p.active),
        0
      ) AS "availableUnits",
      COALESCE(
        SUM(
          ws.quantity::numeric
          * COALESCE(
              NULLIF(p."costPrice"::numeric, 0),
              p."purchasePrice"::numeric,
              0
            )
        ) FILTER (WHERE p.active),
        0
      ) AS "inventoryValue",
      COALESCE(
        SUM(
          ws.quantity::numeric
          * COALESCE(
              NULLIF(p."purchasePrice"::numeric, 0),
              p."costPrice"::numeric,
              0
            )
        ) FILTER (WHERE p.active),
        0
      ) AS "purchaseValue",
      COALESCE(
        SUM(ws.quantity::numeric * p."salePrice"::numeric) FILTER (WHERE p.active),
        0
      ) AS "salesValue",
      COUNT(*) FILTER (
        WHERE p.active
          AND ws.quantity::numeric > 0
          AND ws.quantity::numeric > p."minimumStock"::numeric
      )::bigint AS "availableCount",
      COUNT(*) FILTER (
        WHERE p.active
          AND ws.quantity::numeric > 0
          AND ws.quantity::numeric <= p."minimumStock"::numeric
      )::bigint AS "lowStockCount",
      COUNT(*) FILTER (
        WHERE p.active AND ws.quantity::numeric <= 0
      )::bigint AS "outOfStockCount"
    FROM "WarehouseStock" ws
    INNER JOIN "Product" p ON p.id = ws."productId"
    WHERE ws."companyId" = ${companyId}
      AND p."deletedAt" IS NULL
    GROUP BY ws."warehouseId"
  `;

  const byId = new Map(rows.map((r) => [r.warehouseId, r]));

  return warehouses.map((warehouse) => {
    const row = byId.get(warehouse.id);
    if (!row || Number(row.productsCount) === 0) {
      return emptyWarehouseValuation(warehouse);
    }

    const usedUnits = num(row.usedUnits);
    const availableUnits = num(row.availableUnits);
    const inventoryValue = num(row.inventoryValue);
    const purchaseValue = num(row.purchaseValue);
    const salesValue = num(row.salesValue);
    const productsCount = Number(row.productsCount);
    const availableCount = Number(row.availableCount);
    const lowStockCount = Number(row.lowStockCount);
    const outOfStockCount = Number(row.outOfStockCount);
    const capacity =
      warehouse.capacity != null ? num(warehouse.capacity) : null;
    const capacityPct =
      capacity != null && capacity > 0
        ? Math.min(100, Math.round((usedUnits / capacity) * 1000) / 10)
        : null;
    const outRatio = productsCount > 0 ? outOfStockCount / productsCount : 0;
    const lowRatio = productsCount > 0 ? lowStockCount / productsCount : 0;

    return {
      warehouseId: warehouse.id,
      warehouseName: warehouse.name,
      capacity,
      usedUnits,
      availableUnits,
      capacityPct,
      availableCount,
      lowStockCount,
      outOfStockCount,
      inventoryHealthScore: Math.max(
        0,
        Math.min(100, Math.round(100 - outRatio * 55 - lowRatio * 35))
      ),
      inventoryValue: Math.round(inventoryValue * 100) / 100,
      purchaseValue: Math.round(purchaseValue * 100) / 100,
      salesValue: Math.round(salesValue * 100) / 100,
      averageCost:
        usedUnits > 0
          ? Math.round((inventoryValue / usedUnits) * 100) / 100
          : 0,
      currentAssetValue: Math.round(inventoryValue * 100) / 100,
      productsCount,
      totalUnits: usedUnits,
    };
  });
}
