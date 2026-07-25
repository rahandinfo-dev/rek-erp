import type {
  NotificationCategory,
  NotificationPriority,
} from "@/app/generated/prisma/client";
import { formatDateTime } from "@/lib/utils/datetime";

export const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  PRODUCT: "بەرهەم",
  INVENTORY: "ئینڤێنتۆری",
  SALE: "فرۆشتن",
  PURCHASE: "کڕین",
  CUSTOMER: "کڕیار",
  SUPPLIER: "دابینکەر",
  WAREHOUSE: "کۆگا",
  INVOICE: "پسوولە",
  EMPLOYEE: "کارمەند",
  SYSTEM: "سیستەم / ڕێکخستن",
  ERROR: "هەڵە",
  WARNING: "ئاگاداری",
};

export const PRIORITY_LABELS: Record<NotificationPriority, string> = {
  LOW: "نزم",
  NORMAL: "ئاسایی",
  HIGH: "بەرز",
  CRITICAL: "گرنگ",
};

/** Primary filters shown first in Notification Center */
export const PRIMARY_CATEGORY_OPTIONS: Array<{
  value: NotificationCategory | "";
  label: string;
}> = [
  { value: "", label: "هەموو" },
  { value: "INVENTORY", label: "ئینڤێنتۆری" },
  { value: "SALE", label: "فرۆشتن" },
  { value: "PURCHASE", label: "کڕین" },
  { value: "EMPLOYEE", label: "کارمەند" },
  { value: "SYSTEM", label: "سیستەم / ڕێکخستن" },
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
