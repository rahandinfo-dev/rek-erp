export type StockStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";

export type StockSnapshot = {
  currentStock: number;
  reservedStock: number;
  minimumStock: number;
  maximumStock: number;
  availableStock: number;
  status: StockStatus;
  isLowStock: boolean;
  isOutOfStock: boolean;
  isInStock: boolean;
};

function num(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Stock status (automatic — never manual):
 * - Out of Stock when current === 0 (or less)
 * - Low Stock when current > 0 and current <= minimumStock
 * - Available when current > minimumStock
 */
export function getStockStatus(
  currentStock: unknown,
  minimumStock: unknown
): StockStatus {
  const current = num(currentStock);
  const minimum = Math.max(0, num(minimumStock));

  if (current <= 0) return "OUT_OF_STOCK";
  if (current <= minimum) return "LOW_STOCK";
  return "IN_STOCK";
}

export function getAvailableStock(
  currentStock: unknown,
  reservedStock: unknown = 0
) {
  return Math.max(0, num(currentStock) - num(reservedStock));
}

export function getStockSnapshot(input: {
  currentStock: unknown;
  reservedStock?: unknown;
  minimumStock: unknown;
  maximumStock?: unknown;
}): StockSnapshot {
  const currentStock = num(input.currentStock);
  const reservedStock = Math.max(0, num(input.reservedStock));
  const minimumStock = Math.max(0, num(input.minimumStock));
  const maximumStock = Math.max(0, num(input.maximumStock));
  const availableStock = getAvailableStock(currentStock, reservedStock);
  const status = getStockStatus(currentStock, minimumStock);

  return {
    currentStock,
    reservedStock,
    minimumStock,
    maximumStock,
    availableStock,
    status,
    isLowStock: status === "LOW_STOCK",
    isOutOfStock: status === "OUT_OF_STOCK",
    isInStock: status === "IN_STOCK",
  };
}

export const STOCK_STATUS_LABELS_KU: Record<StockStatus, string> = {
  IN_STOCK: "بەردەست",
  LOW_STOCK: "کۆگای کەم",
  OUT_OF_STOCK: "تەواو",
};

export const STOCK_STATUS_LABELS_EN: Record<StockStatus, string> = {
  IN_STOCK: "Available",
  LOW_STOCK: "Low Stock",
  OUT_OF_STOCK: "کۆگا بەتاڵە",
};

export function formatStockQty(quantity: number, unit?: string | null) {
  const qty = num(quantity).toLocaleString();
  const u = (unit || "").trim();
  return u ? `${qty} ${u}` : qty;
}

/** Green / Orange / Red inventory status badges */
export function stockStatusBadgeClass(status: StockStatus) {
  switch (status) {
    case "OUT_OF_STOCK":
      return "rek-badge rek-badge-stock-out";
    case "LOW_STOCK":
      return "rek-badge rek-badge-stock-low";
    default:
      return "rek-badge rek-badge-stock-in";
  }
}
