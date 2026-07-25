import type { InventoryValuation } from "@/lib/inventory/valuation";

/** Display metrics computed live from Prisma stock × prices. */
export type ValuationMetrics = {
  inventoryValue: number;
  warehouseValue: number;
  purchaseValue: number;
  salesValue: number;
  currentAssetValue: number;
  averageCost: number;
  totalUnits: number;
  productsCount: number;
};

export const VALUATION_LABELS = {
  inventoryValue: "بەهای ئینڤێنتۆری",
  warehouseValue: "بەهای کۆگا",
  purchaseValue: "بەهای کڕین",
  salesValue: "بەهای فرۆشتن",
  currentAssetValue: "بەهای سەروەت",
  averageCost: "تێکڕای تێچوو",
} as const;

/**
 * Normalize company or warehouse valuation into the six display metrics.
 * Warehouse Value = inventory at cost held in warehouses.
 * Current Asset Value = inventory at cost (current inventory asset).
 */
export function toValuationMetrics(
  v: Pick<
    InventoryValuation,
    | "inventoryValue"
    | "purchaseValue"
    | "salesValue"
    | "averageCost"
    | "currentAssetValue"
    | "totalUnits"
    | "productsCount"
  >
): ValuationMetrics {
  const inventoryValue = Number(v.inventoryValue) || 0;
  return {
    inventoryValue,
    warehouseValue: inventoryValue,
    purchaseValue: Number(v.purchaseValue) || 0,
    salesValue: Number(v.salesValue) || 0,
    currentAssetValue: Number(v.currentAssetValue) || inventoryValue,
    averageCost: Number(v.averageCost) || 0,
    totalUnits: Number(v.totalUnits) || 0,
    productsCount: Number(v.productsCount) || 0,
  };
}
