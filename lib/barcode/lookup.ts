import { sanitizeCode128 } from "@/lib/barcode/code128";

export type BarcodeLookupProduct = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  salePrice: number;
  purchasePrice: number;
  currentStock: number;
  reservedStock: number;
  active: boolean;
  image: string | null;
  unit: { id: string; name: string; symbol: string | null } | null;
};

export function normalizeScanCode(raw: string): string {
  return sanitizeCode128(raw);
}
