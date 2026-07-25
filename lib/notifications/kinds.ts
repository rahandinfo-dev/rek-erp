/** Canonical business event kinds stored in Notification.metadata.kind */

export const NOTIFICATION_KINDS = [
  "OUT_OF_STOCK",
  "LOW_STOCK",
  "AT_MINIMUM",
  "WAREHOUSE_LOW",
  "WAREHOUSE_CAPACITY",
  "INVENTORY_ADJUSTMENT",
  "WAREHOUSE_TRANSFER",
  "LARGE_PURCHASE",
  "LARGE_SALE",
] as const;

export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

/** Events that auto-toast and appear in alerts panels / analytics. */
export const SYNC_TOAST_KINDS = new Set<string>([
  "OUT_OF_STOCK",
  "LOW_STOCK",
  "AT_MINIMUM",
  "WAREHOUSE_LOW",
  "WAREHOUSE_CAPACITY",
  "INVENTORY_ADJUSTMENT",
  "WAREHOUSE_TRANSFER",
  "LARGE_PURCHASE",
  "LARGE_SALE",
]);

export const KIND_LABELS_KU: Record<NotificationKind, string> = {
  OUT_OF_STOCK: "کۆگا تەواو",
  LOW_STOCK: "کۆگای کەم",
  AT_MINIMUM: "کەمترین بڕ",
  WAREHOUSE_LOW: "کۆگا کەم",
  WAREHOUSE_CAPACITY: "توانای کۆگا",
  INVENTORY_ADJUSTMENT: "ڕێکخستنی کۆگا",
  WAREHOUSE_TRANSFER: "گواستنەوەی کۆگا",
  LARGE_PURCHASE: "کڕینی گەورە",
  LARGE_SALE: "فرۆشتنی گەورە",
};

export function extractNotificationKind(
  metadata: unknown
): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const kind = (metadata as Record<string, unknown>).kind;
  return typeof kind === "string" ? kind : null;
}

export function isSyncToastKind(kind: string | null | undefined): boolean {
  return Boolean(kind && SYNC_TOAST_KINDS.has(kind));
}

export function isAlertsPanelKind(kind: string | null | undefined): boolean {
  return isSyncToastKind(kind);
}
