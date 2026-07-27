import { DRAFT_KEYS, type DraftCenterStatus } from "@/lib/drafts/types";

export type { DraftCenterStatus };

export type DraftModuleFilter =
  | "all"
  | "products"
  | "sales"
  | "purchases"
  | "invoices"
  | "customers"
  | "suppliers"
  | "warehouses"
  | "employees"
  | "reports"
  | "expenses"
  | "settings"
  | "analytics"
  | "dashboard"
  | "notifications"
  | "calculator"
  | "other";

export type DraftListItem = {
  key: string;
  title: string;
  moduleKey: string;
  moduleLabel: string;
  status: DraftCenterStatus;
  pinned: boolean;
  archived: boolean;
  progress: number;
  device: string | null;
  tags: string[];
  createdAt: number;
  savedAt: number;
  updatedAt: number;
  resumeHref: string;
  shareToken?: string | null;
  /** Lightweight summary fields changed (no full payload in list) */
  modifiedFields: string[];
  source: "form" | "session";
};

const MODULE_LABELS: Record<string, string> = {
  products: "بەرهەمەکان",
  sales: "فرۆشتن",
  purchases: "کڕین",
  invoices: "پسوولەکان",
  customers: "کڕیارەکان",
  suppliers: "دابینکەران",
  warehouses: "کۆگاکان",
  employees: "کارمەندان",
  reports: "ڕاپۆرتەکان",
  expenses: "خەرجییەکان",
  settings: "ڕێکخستنەکان",
  analytics: "شیکاری",
  dashboard: "شێوازی داشبۆرد",
  notifications: "ئاگادارییەکان",
  calculator: "ژمێرەر",
  brands: "براندەکان",
  categories: "پۆلەکان",
  units: "یەکەکان",
  other: "هیتر",
};

export function moduleLabel(moduleKey: string) {
  return MODULE_LABELS[moduleKey] || moduleKey;
}

/** Map draftKey → module bucket */
export function moduleFromDraftKey(key: string): string {
  const k = key.toLowerCase();
  if (k.startsWith("product") || k.startsWith("brand") || k.startsWith("category") || k.startsWith("unit"))
    return "products";
  if (k.startsWith("sale")) return "sales";
  if (k.startsWith("purchase")) return "purchases";
  if (k.startsWith("invoice")) return "invoices";
  if (k.startsWith("customer")) return "customers";
  if (k.startsWith("supplier")) return "suppliers";
  if (k.startsWith("warehouse") || k.startsWith("werehouse")) return "warehouses";
  if (k.startsWith("employee")) return "employees";
  if (k.startsWith("report")) return "reports";
  if (k.startsWith("expense")) return "expenses";
  if (k.startsWith("company") || k.startsWith("settings")) return "settings";
  if (k.startsWith("analytics")) return "analytics";
  if (k.startsWith("dashboard") || k.startsWith("workspace")) return "dashboard";
  if (k.startsWith("notification")) return "notifications";
  if (k.startsWith("calculator")) return "calculator";
  return "other";
}

export function defaultTitleForKey(key: string): string {
  const map: Record<string, string> = {
    [DRAFT_KEYS.saleNew]: "فرۆشتنی نوێ",
    [DRAFT_KEYS.purchaseNew]: "کڕینی نوێ",
    [DRAFT_KEYS.productNew]: "بەرهەمی نوێ",
    [DRAFT_KEYS.productEdit]: "Edit Product",
    [DRAFT_KEYS.companySettings]: "Company Settings",
    [DRAFT_KEYS.employeeNew]: "کارمەندی نوێ",
    [DRAFT_KEYS.employeeEdit]: "Edit Employee",
    [DRAFT_KEYS.customerNew]: "کڕیاری نوێ",
    [DRAFT_KEYS.customerEdit]: "Edit Customer",
    [DRAFT_KEYS.supplierNew]: "دابینکەری نوێ",
    [DRAFT_KEYS.supplierEdit]: "Edit Supplier",
    [DRAFT_KEYS.warehouseNew]: "کۆگای نوێ",
    [DRAFT_KEYS.warehouseEdit]: "Edit Warehouse",
    [DRAFT_KEYS.reportsFilters]: "Report Filters",
    [DRAFT_KEYS.calculator]: "ژمێرەر",
    [DRAFT_KEYS.brandNew]: "براندی نوێ",
    [DRAFT_KEYS.brandEdit]: "Edit Brand",
    [DRAFT_KEYS.categoryNew]: "پۆلی نوێ",
    [DRAFT_KEYS.categoryEdit]: "Edit Category",
    [DRAFT_KEYS.unitNew]: "یەکەی نوێ",
    [DRAFT_KEYS.unitEdit]: "Edit Unit",
  };
  if (map[key]) return map[key];
  if (key.startsWith("product:edit:")) return "Edit Product";
  if (key.startsWith("employee:edit:")) return "Edit Employee";
  return key.replace(/[:_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function resumeHrefForKey(key: string): string {
  const map: Record<string, string> = {
    [DRAFT_KEYS.saleNew]: "/dashboard/sales/new",
    [DRAFT_KEYS.purchaseNew]: "/dashboard/purchases/new",
    [DRAFT_KEYS.productNew]: "/dashboard/products/new",
    [DRAFT_KEYS.companySettings]: "/dashboard/settings",
    [DRAFT_KEYS.employeeNew]: "/dashboard/employees/new",
    [DRAFT_KEYS.customerNew]: "/dashboard/customers/new",
    [DRAFT_KEYS.customerEdit]: "/dashboard/customers",
    [DRAFT_KEYS.supplierNew]: "/dashboard/suppliers/new",
    [DRAFT_KEYS.supplierEdit]: "/dashboard/suppliers",
    [DRAFT_KEYS.warehouseNew]: "/dashboard/werehouse/new",
    [DRAFT_KEYS.warehouseEdit]: "/dashboard/werehouse",
    [DRAFT_KEYS.reportsFilters]: "/dashboard/reports",
    [DRAFT_KEYS.calculator]: "/dashboard/calculator",
    [DRAFT_KEYS.brandNew]: "/dashboard/brands/new",
    [DRAFT_KEYS.categoryNew]: "/dashboard/category/new",
    [DRAFT_KEYS.unitNew]: "/dashboard/units/new",
  };
  if (map[key]) return map[key];
  const productEdit = key.match(/^product:edit:(.+)$/);
  if (productEdit) return `/dashboard/products/${productEdit[1]}/edit`;
  const empEdit = key.match(/^employee:edit:(.+)$/);
  if (empEdit) return `/dashboard/employees/${empEdit[1]}`;
  const brandEdit = key.match(/^brand:edit:(.+)$/);
  if (brandEdit) return `/dashboard/brands/${brandEdit[1]}/edit`;
  const catEdit = key.match(/^category:edit:(.+)$/);
  if (catEdit) return `/dashboard/category/${catEdit[1]}/edit`;
  const unitEdit = key.match(/^unit:edit:(.+)$/);
  if (unitEdit) return `/dashboard/units/${unitEdit[1]}/edit`;
  const custEdit = key.match(/^customer:edit:(.+)$/);
  if (custEdit) return `/dashboard/customers/${custEdit[1]}/edit`;
  const supEdit = key.match(/^supplier:edit:(.+)$/);
  if (supEdit) return `/dashboard/suppliers/${supEdit[1]}/edit`;
  const whEdit = key.match(/^warehouse:edit:(.+)$/);
  if (whEdit) return `/dashboard/werehouse/${whEdit[1]}`;
  return "/dashboard/drafts";
}

const IMPORTANT_FIELDS = [
  "name",
  "fullName",
  "title",
  "email",
  "phone",
  "salePrice",
  "purchasePrice",
  "purchaseCost",
  "stock",
  "quantity",
  "categoryId",
  "brandId",
  "unitId",
  "warehouseId",
  "werehouseId",
  "customerId",
  "supplierId",
  "items",
  "notes",
  "sku",
  "barcode",
  "address",
  "status",
];

/** Estimate completion % from filled meaningful fields. */
export function estimateProgress(data: unknown): number {
  if (!data || typeof data !== "object") return 0;
  const obj = data as Record<string, unknown>;
  const keys = IMPORTANT_FIELDS.filter((k) => k in obj);
  const pool = keys.length ? keys : Object.keys(obj).slice(0, 12);
  if (!pool.length) return 5;
  let filled = 0;
  for (const k of pool) {
    const v = obj[k];
    if (v == null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    filled += 1;
  }
  return Math.min(99, Math.max(5, Math.round((filled / pool.length) * 100)));
}

export function modifiedFieldLabels(data: unknown): string[] {
  if (!data || typeof data !== "object") return [];
  const obj = data as Record<string, unknown>;
  const out: string[] = [];
  for (const k of IMPORTANT_FIELDS) {
    const v = obj[k];
    if (v == null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out.push(k);
    if (out.length >= 8) break;
  }
  return out;
}

export function deviceLabel() {
  if (typeof navigator === "undefined") return "Server";
  const ua = navigator.userAgent;
  if (/Mobile|Android|iPhone/i.test(ua)) return "Mobile";
  if (/iPad|Tablet/i.test(ua)) return "Tablet";
  if (/Macintosh|Mac OS/i.test(ua)) return "Mac";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Linux/i.test(ua)) return "Linux";
  return "Desktop";
}

export const ARCHIVE_AFTER_MS = 90 * 24 * 60 * 60 * 1000;

export function relativeTime(ts: number) {
  const sec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (sec < 45) return "ئێستا";
  if (sec < 3600) return `${Math.floor(sec / 60)} خولەک پێش ئێستا`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} کاتژمێر پێش ئێستا`;
  return `${Math.floor(sec / 86400)} ڕۆژ پێش ئێستا`;
}
