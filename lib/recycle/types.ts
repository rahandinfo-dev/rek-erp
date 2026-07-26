export const RECYCLE_MODULES = [
  "products",
  "sales",
  "purchases",
  "invoices",
  "customers",
  "suppliers",
  "warehouses",
  "employees",
  "brands",
  "categories",
  "units",
] as const;

export type RecycleModule = (typeof RECYCLE_MODULES)[number];

export type RecycleStatus = "deleted" | "restored" | "purged";

export type RecycleBinItem = {
  id: string;
  name: string;
  moduleKey: RecycleModule | string;
  moduleLabel: string;
  entityType: string;
  entityId: string;
  deletedBy: string | null;
  deletedById: string | null;
  deletedAt: number;
  expiresAt: number;
  daysRemaining: number;
  reason: string | null;
  status: RecycleStatus;
  related: Array<{ label: string; count: number }>;
  restoreUrl: string | null;
  purgeUrl: string | null;
  detailHref: string | null;
};

export type RecycleBinPrefs = {
  retentionDays: 30 | 60 | 90;
};

export const RETENTION_OPTIONS = [30, 60, 90] as const;

export const MODULE_LABELS: Record<string, string> = {
  products: "بەرهەمەکان",
  sales: "فرۆشتن",
  purchases: "کڕین",
  invoices: "پسوولەکان",
  customers: "کڕیارەکان",
  suppliers: "دابینکەران",
  warehouses: "کۆگاکان",
  employees: "کارمەندان",
  brands: "براندەکان",
  categories: "پۆلەکان",
  units: "یەکەکان",
  expenses: "خەرجییەکان",
  reports: "ڕاپۆرتەکان",
  settings: "ڕێکخستنەکان",
};

export function daysRemaining(expiresAt: number, now = Date.now()) {
  return Math.max(0, Math.ceil((expiresAt - now) / 86400000));
}
