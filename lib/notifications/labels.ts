import type {
  NotificationCategory,
  NotificationPriority,
} from "@/lib/prisma/client";
import { formatDateTime } from "@/lib/utils/datetime";

export const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  PRODUCT: "Ø¨Û•Ø±Ù‡Û•Ù…",
  INVENTORY: "Ø¦ÛŒÙ†Ú¤ÛŽÙ†ØªÛ†Ø±ÛŒ",
  SALE: "ÙØ±Û†Ø´ØªÙ†",
  PURCHASE: "Ú©Ú•ÛŒÙ†",
  CUSTOMER: "Ú©Ú•ÛŒØ§Ø±",
  SUPPLIER: "Ø¯Ø§Ø¨ÛŒÙ†Ú©Û•Ø±",
  WAREHOUSE: "Ú©Û†Ú¯Ø§",
  INVOICE: "Ù¾Ø³ÙˆÙˆÙ„Û•",
  EMPLOYEE: "Ú©Ø§Ø±Ù…Û•Ù†Ø¯",
  SYSTEM: "Ø³ÛŒØ³ØªÛ•Ù… / Ú•ÛŽÚ©Ø®Ø³ØªÙ†",
  ERROR: "Ù‡Û•ÚµÛ•",
  WARNING: "Ø¦Ø§Ú¯Ø§Ø¯Ø§Ø±ÛŒ",
};

export const PRIORITY_LABELS: Record<NotificationPriority, string> = {
  LOW: "Ù†Ø²Ù…",
  NORMAL: "Ø¦Ø§Ø³Ø§ÛŒÛŒ",
  HIGH: "Ø¨Û•Ø±Ø²",
  CRITICAL: "Ú¯Ø±Ù†Ú¯",
};

/** Primary filters shown first in Notification Center */
export const PRIMARY_CATEGORY_OPTIONS: Array<{
  value: NotificationCategory | "";
  label: string;
}> = [
  { value: "", label: "Ù‡Û•Ù…ÙˆÙˆ" },
  { value: "INVENTORY", label: "Ø¦ÛŒÙ†Ú¤ÛŽÙ†ØªÛ†Ø±ÛŒ" },
  { value: "SALE", label: "ÙØ±Û†Ø´ØªÙ†" },
  { value: "PURCHASE", label: "Ú©Ú•ÛŒÙ†" },
  { value: "EMPLOYEE", label: "Ú©Ø§Ø±Ù…Û•Ù†Ø¯" },
  { value: "SYSTEM", label: "Ø³ÛŒØ³ØªÛ•Ù… / Ú•ÛŽÚ©Ø®Ø³ØªÙ†" },
];

export const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS).map(
  ([value, label]) => ({ value, label })
);

export const PRIORITY_OPTIONS = Object.entries(PRIORITY_LABELS).map(
  ([value, label]) => ({ value, label })
);

export function priorityClass(priority: NotificationPriority): string {
  switch (priority) {
    case "CRITICAL":
      return "bg-red-100 text-red-800";
    case "HIGH":
      return "bg-amber-100 text-amber-800";
    case "LOW":
      return "bg-slate-100 text-slate-600";
    default:
      return "bg-[#FFF8EF] text-[#FFAE42]";
  }
}

export function formatNotificationDate(iso: string): string {
  return formatDateTime(iso);
}
