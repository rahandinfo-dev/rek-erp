import type { InventoryTransactionType } from "@/lib/prisma/client";

/** Kurdish labels for every permanent inventory movement type. */
export const MOVEMENT_TYPE_LABELS: Record<InventoryTransactionType, string> = {
  PRODUCT_CREATE: "Ø¯Ø±ÙˆØ³ØªÚ©Ø±Ø¯Ù†ÛŒ Ø¨Û•Ø±Ù‡Û•Ù…",
  PURCHASE: "Ú©Ú•ÛŒÙ†",
  SALE: "ÙØ±Û†Ø´ØªÙ†",
  ADJUSTMENT: "Ú•ÛŽÚ©Ø®Ø³ØªÙ†ÛŒ Ø¯Û•Ø³ØªÛŒ",
  TRANSFER_IN: "Ú¯ÙˆØ§Ø³ØªÙ†Û•ÙˆÛ•ÛŒ Ù†Ø§ÙˆÛ•ÙˆÛ•",
  TRANSFER_OUT: "Ú¯ÙˆØ§Ø³ØªÙ†Û•ÙˆÛ•ÛŒ Ø¯Û•Ø±Û•ÙˆÛ•",
  PRODUCT_DELETE: "Ø³Ú•ÛŒÙ†Û•ÙˆÛ•",
  RESTORE: "Ú¯Û•Ú•Ø§Ù†Ø¯Ù†Û•ÙˆÛ•",
  SALE_RETURN: "Ú¯Û•Ú•Ø§Ù†Ø¯Ù†Û•ÙˆÛ•ÛŒ ÙØ±Û†Ø´ØªÙ†",
  PURCHASE_RETURN: "Ú¯Û•Ú•Ø§Ù†Ø¯Ù†Û•ÙˆÛ•ÛŒ Ú©Ú•ÛŒÙ†",
};

export const MOVEMENT_TYPE_OPTIONS = (
  Object.entries(MOVEMENT_TYPE_LABELS) as [InventoryTransactionType, string][]
).map(([value, label]) => ({ value, label }));

export function movementTypeLabel(type: string): string {
  return (
    MOVEMENT_TYPE_LABELS[type as InventoryTransactionType] || type
  );
}
