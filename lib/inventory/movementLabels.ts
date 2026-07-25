import type { InventoryTransactionType } from "@/app/generated/prisma/client";

/** Kurdish labels for every permanent inventory movement type. */
export const MOVEMENT_TYPE_LABELS: Record<InventoryTransactionType, string> = {
  PRODUCT_CREATE: "دروستکردنی بەرهەم",
  PURCHASE: "کڕین",
  SALE: "فرۆشتن",
  ADJUSTMENT: "ڕێکخستنی دەستی",
  TRANSFER_IN: "گواستنەوەی ناوەوە",
  TRANSFER_OUT: "گواستنەوەی دەرەوە",
  PRODUCT_DELETE: "سڕینەوە",
  RESTORE: "گەڕاندنەوە",
  SALE_RETURN: "گەڕاندنەوەی فرۆشتن",
  PURCHASE_RETURN: "گەڕاندنەوەی کڕین",
};

export const MOVEMENT_TYPE_OPTIONS = (
  Object.entries(MOVEMENT_TYPE_LABELS) as [InventoryTransactionType, string][]
).map(([value, label]) => ({ value, label }));

export function movementTypeLabel(type: string): string {
  return (
    MOVEMENT_TYPE_LABELS[type as InventoryTransactionType] || type
  );
}
