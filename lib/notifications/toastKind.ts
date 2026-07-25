"use client";

import { appToast } from "@/lib/toast";
import { isSyncToastKind } from "@/lib/notifications/kinds";
import {
  markNotificationToasted,
  wasNotificationToasted,
} from "@/lib/notifications/bus";

export type ToastableNotification = {
  id: string;
  title: string;
  message: string;
  kind: string | null;
};

/** Toast a synced business notification once per browser session. */
export function toastNotificationOnce(item: ToastableNotification): boolean {
  if (!item.id || !isSyncToastKind(item.kind)) return false;
  if (wasNotificationToasted(item.id)) return false;

  markNotificationToasted(item.id);
  toastByKind(item.kind!, item.title, item.message);
  return true;
}

export function toastByKind(kind: string, title: string, message: string) {
  switch (kind) {
    case "OUT_OF_STOCK":
      appToast.stockOut(message, title);
      break;
    case "LOW_STOCK":
    case "AT_MINIMUM":
      appToast.stockLow(message, title);
      break;
    case "WAREHOUSE_LOW":
    case "WAREHOUSE_CAPACITY":
      appToast.warehouseStockLow(message, title);
      break;
    case "INVENTORY_ADJUSTMENT":
      appToast.inventoryAdjusted(message, title);
      break;
    case "WAREHOUSE_TRANSFER":
      appToast.warehouseTransfer(message, title);
      break;
    case "LARGE_SALE":
      appToast.largeSale(message, title);
      break;
    case "LARGE_PURCHASE":
      appToast.largePurchase(message, title);
      break;
    default:
      appToast.warning(title, message);
  }
}
