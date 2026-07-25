import { getStockStatus } from "@/lib/inventory/stock";
import type { WarehouseValuation } from "@/lib/inventory/valuation";

export type InventoryTrendPoint = {
  name: string;
  inventoryValue: number;
  stockUnits: number;
  lowStockCount: number;
  outOfStockCount: number;
  healthScore: number;
};

export type WarehouseDistributionPoint = {
  id: string;
  name: string;
  inventoryValue: number;
  units: number;
  availableUnits: number;
  capacityPct: number | null;
  healthScore: number;
};

export type TrendPoint = {
  name: string;
  value: number;
};

type ProductSnap = {
  id: string;
  currentStock: number;
  minimumStock: number;
  unitCost: number;
};

type TxSnap = {
  productId: string;
  createdAt: Date;
  delta: number;
};

function num(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function monthLabel(d: Date) {
  return `${d.getMonth() + 1}/${d.getFullYear()}`;
}

/** Prefer previousQty/newQty; fall back to transaction type. */
export function movementDelta(input: {
  type: string;
  quantity: unknown;
  previousQty: unknown;
  newQty: unknown;
}): number {
  if (input.previousQty != null && input.newQty != null) {
    return num(input.newQty) - num(input.previousQty);
  }

  const qty = Math.abs(num(input.quantity));
  switch (input.type) {
    case "PURCHASE":
    case "SALE_RETURN":
    case "TRANSFER_IN":
    case "PRODUCT_CREATE":
    case "RESTORE":
      return qty;
    case "SALE":
    case "PURCHASE_RETURN":
    case "TRANSFER_OUT":
    case "PRODUCT_DELETE":
      return -qty;
    case "ADJUSTMENT":
      return num(input.quantity);
    default:
      return 0;
  }
}

/**
 * Reconstruct month-end inventory value / stock / low-stock / health
 * from live Product balances + InventoryTransaction history.
 */
export function buildInventoryTrendSeries(input: {
  months: Date[];
  products: Array<{
    id: string;
    currentStock: unknown;
    minimumStock: unknown;
    costPrice: unknown;
    purchasePrice: unknown;
  }>;
  transactions: Array<{
    productId: string;
    type: string;
    quantity: unknown;
    previousQty: unknown;
    newQty: unknown;
    createdAt: Date;
  }>;
}): InventoryTrendPoint[] {
  const products: ProductSnap[] = input.products.map((p) => ({
    id: p.id,
    currentStock: num(p.currentStock),
    minimumStock: Math.max(0, num(p.minimumStock)),
    unitCost: num(p.costPrice) || num(p.purchasePrice) || 0,
  }));

  const txs: TxSnap[] = input.transactions
    .map((t) => ({
      productId: t.productId,
      createdAt: t.createdAt,
      delta: movementDelta(t),
    }))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  // Deltas after a timestamp, keyed by product.
  const deltasAfter = (cutoff: Date) => {
    const map = new Map<string, number>();
    for (const t of txs) {
      if (t.createdAt.getTime() <= cutoff.getTime()) continue;
      map.set(t.productId, (map.get(t.productId) || 0) + t.delta);
    }
    return map;
  };

  return input.months.map((monthStart) => {
    const monthEnd = new Date(
      monthStart.getFullYear(),
      monthStart.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );
    const after = deltasAfter(monthEnd);

    let stockUnits = 0;
    let inventoryValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const p of products) {
      const stock = Math.max(0, p.currentStock - (after.get(p.id) || 0));
      stockUnits += stock;
      inventoryValue += stock * p.unitCost;
      const status = getStockStatus(stock, p.minimumStock);
      if (status === "OUT_OF_STOCK") outOfStockCount += 1;
      else if (status === "LOW_STOCK") lowStockCount += 1;
    }

    const productsCount = products.length;
    const outRatio = productsCount > 0 ? outOfStockCount / productsCount : 0;
    const lowRatio = productsCount > 0 ? lowStockCount / productsCount : 0;
    const healthScore = Math.max(
      0,
      Math.min(100, Math.round(100 - outRatio * 55 - lowRatio * 35))
    );

    return {
      name: monthLabel(monthStart),
      inventoryValue: Math.round(inventoryValue * 100) / 100,
      stockUnits: Math.round(stockUnits * 100) / 100,
      lowStockCount,
      outOfStockCount,
      healthScore,
    };
  });
}

export function toWarehouseDistribution(
  valuations: WarehouseValuation[]
): WarehouseDistributionPoint[] {
  return valuations
    .map((v) => ({
      id: v.warehouseId,
      name: v.warehouseName,
      inventoryValue: v.inventoryValue,
      units: v.usedUnits,
      availableUnits: v.availableUnits,
      capacityPct: v.capacityPct,
      healthScore: v.inventoryHealthScore,
    }))
    .filter((v) => v.inventoryValue > 0 || v.units > 0)
    .sort((a, b) => b.inventoryValue - a.inventoryValue);
}

export function toSimpleTrend(
  points: InventoryTrendPoint[],
  key: keyof Pick<
    InventoryTrendPoint,
    "inventoryValue" | "stockUnits" | "lowStockCount" | "healthScore"
  >
): TrendPoint[] {
  return points.map((p) => ({ name: p.name, value: Number(p[key]) }));
}

export function salesPurchaseTrend(
  monthly: Array<{ name: string; sales: number; purchases: number }>
): { salesTrend: TrendPoint[]; purchaseTrend: TrendPoint[] } {
  return {
    salesTrend: monthly.map((m) => ({ name: m.name, value: m.sales })),
    purchaseTrend: monthly.map((m) => ({ name: m.name, value: m.purchases })),
  };
}
