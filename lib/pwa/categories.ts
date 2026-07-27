/**
 * Enterprise push notification preference categories.
 * Mapped from Prisma NotificationCategory (+ extras for product UX).
 */

export const PUSH_CATEGORIES = [
  "LOW_STOCK",
  "NEW_ORDERS",
  "NEW_SALES",
  "NEW_PURCHASES",
  "INVOICE_DUE",
  "PAYMENT_RECEIVED",
  "SUPPLIER_PAYMENT",
  "EMPLOYEE_ALERTS",
  "SYSTEM_ALERTS",
  "SECURITY_ALERTS",
  "AI_ALERTS",
  "BACKUP_STATUS",
  "REPORTS_READY",
  "GENERAL",
] as const;

export type PushCategory = (typeof PUSH_CATEGORIES)[number];

export type PushCategoryMap = Record<PushCategory, boolean>;

export const PUSH_CATEGORY_LABELS: Record<
  PushCategory,
  { en: string; ku: string }
> = {
  LOW_STOCK: { en: "Low Stock", ku: "کۆگای کەم" },
  NEW_ORDERS: { en: "New Orders", ku: "داواکاری نوێ" },
  NEW_SALES: { en: "New Sales", ku: "فرۆشتنی نوێ" },
  NEW_PURCHASES: { en: "New Purchases", ku: "کڕینی نوێ" },
  INVOICE_DUE: { en: "Invoice Due", ku: "پسوولەی بەسەرچوو" },
  PAYMENT_RECEIVED: { en: "Payment Received", ku: "پارە وەرگیرا" },
  SUPPLIER_PAYMENT: { en: "Supplier Payment", ku: "پارەدانی دابینکەر" },
  EMPLOYEE_ALERTS: { en: "Employee Alerts", ku: "ئاگاداری کارمەند" },
  SYSTEM_ALERTS: { en: "System Alerts", ku: "ئاگاداری سیستەم" },
  SECURITY_ALERTS: { en: "Security Alerts", ku: "ئاگاداری ئاسایش" },
  AI_ALERTS: { en: "AI Alerts", ku: "ئاگاداری زیرەک" },
  BACKUP_STATUS: { en: "Backup Status", ku: "دۆخی باکئەپ" },
  REPORTS_READY: { en: "Reports Ready", ku: "ڕاپۆرت ئامادەیە" },
  GENERAL: { en: "General Announcements", ku: "ئاگاداری گشتی" },
};

export const DEFAULT_PUSH_CATEGORIES: PushCategoryMap = {
  LOW_STOCK: true,
  NEW_ORDERS: true,
  NEW_SALES: true,
  NEW_PURCHASES: true,
  INVOICE_DUE: true,
  PAYMENT_RECEIVED: true,
  SUPPLIER_PAYMENT: true,
  EMPLOYEE_ALERTS: true,
  SYSTEM_ALERTS: true,
  SECURITY_ALERTS: true,
  AI_ALERTS: true,
  BACKUP_STATUS: true,
  REPORTS_READY: true,
  GENERAL: true,
};

/** Map Prisma NotificationCategory (+ metadata.kind) → push preference key. */
export function resolvePushCategory(input: {
  category: string;
  kind?: string | null;
  metadata?: unknown;
}): PushCategory {
  const kind =
    input.kind ||
    (input.metadata &&
    typeof input.metadata === "object" &&
    !Array.isArray(input.metadata)
      ? String((input.metadata as Record<string, unknown>).kind || "")
      : "");

  if (
    kind === "LOW_STOCK" ||
    kind === "OUT_OF_STOCK" ||
    kind === "AT_MINIMUM" ||
    kind === "WAREHOUSE_LOW" ||
    kind === "WAREHOUSE_CAPACITY"
  ) {
    return "LOW_STOCK";
  }
  if (kind === "LARGE_SALE") return "NEW_SALES";
  if (kind === "LARGE_PURCHASE") return "NEW_PURCHASES";
  if (kind === "BACKUP" || kind === "BACKUP_STATUS") return "BACKUP_STATUS";
  if (kind === "REPORT" || kind === "REPORTS_READY") return "REPORTS_READY";
  if (kind === "SECURITY" || kind === "SECURITY_ALERT") return "SECURITY_ALERTS";
  if (kind === "PAYMENT" || kind === "PAYMENT_RECEIVED") return "PAYMENT_RECEIVED";
  if (kind === "SUPPLIER_PAYMENT") return "SUPPLIER_PAYMENT";
  if (kind === "AI_ALERT" || kind === "AI_ALERTS") return "AI_ALERTS";
  if (kind === "INVOICE_DUE") return "INVOICE_DUE";
  if (kind === "NEW_ORDER" || kind === "NEW_ORDERS") return "NEW_ORDERS";

  switch (input.category) {
    case "INVENTORY":
    case "PRODUCT":
    case "WAREHOUSE":
      return "LOW_STOCK";
    case "SALE":
      return "NEW_SALES";
    case "PURCHASE":
      return "NEW_PURCHASES";
    case "INVOICE":
      return "INVOICE_DUE";
    case "EMPLOYEE":
      return "EMPLOYEE_ALERTS";
    case "ERROR":
    case "WARNING":
    case "SYSTEM":
      return "SYSTEM_ALERTS";
    case "CUSTOMER":
    case "SUPPLIER":
      return "GENERAL";
    default:
      return "GENERAL";
  }
}

export function parseCategoryMap(raw: unknown): PushCategoryMap {
  const base = { ...DEFAULT_PUSH_CATEGORIES };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;
  const obj = raw as Record<string, unknown>;
  for (const key of PUSH_CATEGORIES) {
    if (typeof obj[key] === "boolean") base[key] = obj[key];
  }
  return base;
}
