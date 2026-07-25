import type { QuickActionModule } from "@/lib/quick-actions/types";

const LIST_PATH: Record<string, string> = {
  products: "/dashboard/products",
  sales: "/dashboard/sales",
  purchases: "/dashboard/purchases",
  invoices: "/dashboard/invoices",
  customers: "/dashboard/customers",
  suppliers: "/dashboard/suppliers",
  warehouses: "/dashboard/werehouse",
  employees: "/dashboard/employees",
  reports: "/dashboard/reports",
  expenses: "/dashboard/reports",
  categories: "/dashboard/category",
  brands: "/dashboard/brands",
  units: "/dashboard/units",
};

/** Modules that only have edit pages (no dedicated detail view). */
const EDIT_ONLY = new Set([
  "customers",
  "suppliers",
  "categories",
  "brands",
  "units",
]);

export function listPathFor(moduleKey: string): string {
  return LIST_PATH[moduleKey] || "/dashboard";
}

export function viewHrefFor(moduleKey: string, id: string): string {
  const base = listPathFor(moduleKey);
  if (EDIT_ONLY.has(moduleKey)) return `${base}/${id}/edit`;
  if (moduleKey === "reports" || moduleKey === "expenses") return base;
  return `${base}/${id}`;
}

export function editHrefFor(moduleKey: string, id: string): string {
  const base = listPathFor(moduleKey);
  if (moduleKey === "reports" || moduleKey === "expenses") return base;
  if (
    moduleKey === "sales" ||
    moduleKey === "purchases" ||
    moduleKey === "invoices" ||
    moduleKey === "employees" ||
    moduleKey === "warehouses"
  ) {
    return `${base}/${id}`;
  }
  return `${base}/${id}/edit`;
}

export function duplicateHrefFor(moduleKey: string, id: string): string {
  const base = listPathFor(moduleKey);
  if (moduleKey === "reports" || moduleKey === "expenses") return base;
  return `${base}/new?clone=${encodeURIComponent(id)}`;
}

export function timelineHrefFor(moduleKey: string, id: string): string {
  const params = new URLSearchParams({
    entityId: id,
    module: moduleKey,
  });
  return `/dashboard/activity?${params.toString()}`;
}

export function auditHrefFor(moduleKey: string, id: string): string {
  const params = new URLSearchParams({
    entityId: id,
    module: moduleKey,
  });
  return `/dashboard/audit-log?${params.toString()}`;
}

export function absoluteUrl(path: string): string {
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`;
}

export function normalizeModuleKey(key: string): QuickActionModule | string {
  if (key === "werehouse" || key === "warehouse") return "warehouses";
  if (key === "category") return "categories";
  return key;
}
