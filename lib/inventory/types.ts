/**
 * Shared inventory types — safe for client imports (no Prisma/db).
 */
import type { StockStatus } from "@/lib/inventory/stock";

export type InventoryStatusFilter = "all" | "available" | "low" | "out";

export type InventorySort =
  | "newest"
  | "oldest"
  | "price"
  | "price_asc"
  | "price_desc"
  | "name"
  | "stock_high"
  | "stock_low";

export type InventoryProductRow = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  image: string | null;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  minimumStock: number;
  maximumStock: number;
  purchasePrice: number;
  salePrice: number;
  active: boolean;
  createdAt: string;
  unit: { id: string; name: string; symbol: string | null };
  warehouseName: string;
  status: StockStatus;
};

export type InventoryMovementRow = {
  id: string;
  type: string;
  quantity: number;
  previousQty: number | null;
  newQty: number | null;
  reason: string | null;
  referenceNo: string | null;
  createdAt: string;
  product: { id: string; name: string; sku: string };
  warehouse: { id: string; name: string; code: string };
  userName: string | null;
};

export type InventorySummary = {
  productsCount: number;
  availableCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalCurrent: number;
  totalAvailable: number;
  totalReserved: number;
};
