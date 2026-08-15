import type { RecycleModule } from "@/lib/recycle/types";

export function moduleFromAudit(
  module: string,
  entityType?: string | null
): RecycleModule | string {
  const t = `${module} ${entityType || ""}`.toLowerCase();
  if (t.includes("invoicetemplate") || t.includes("invoice template")) {
    return "invoice-templates";
  }
  if (t.includes("product")) return "products";
  if (t.includes("sale")) return "sales";
  if (t.includes("purchase")) return "purchases";
  if (t.includes("invoice")) return "invoices";
  if (t.includes("customer")) return "customers";
  if (t.includes("supplier")) return "suppliers";
  if (t.includes("warehouse") || t.includes("werehouse")) return "warehouses";
  if (t.includes("employee")) return "employees";
  if (t.includes("brand")) return "brands";
  if (t.includes("categor")) return "categories";
  if (t.includes("unit")) return "units";
  return module.toLowerCase();
}

export function restoreUrlFor(
  moduleKey: string,
  entityId: string
): string | null {
  switch (moduleKey) {
    case "products":
      return `/api/products/${entityId}/restore`;
    case "customers":
      return `/api/customers/${entityId}/restore`;
    case "suppliers":
      return `/api/suppliers/${entityId}/restore`;
    case "sales":
      return `/api/sales/${entityId}/restore`;
    case "purchases":
      return `/api/purchases/${entityId}/restore`;
    case "invoices":
      return `/api/invoices/${entityId}/restore`;
    case "warehouses":
      return `/api/werehouses/${entityId}/restore`;
    case "employees":
      return `/api/employees/${entityId}/restore`;
    case "brands":
      return `/api/brands/${entityId}/restore`;
    case "categories":
      return `/api/categories/${entityId}/restore`;
    case "units":
      return `/api/units/${entityId}/restore`;
    case "invoice-templates":
      return `/api/invoice-templates/${entityId}/restore`;
    default:
      return null;
  }
}

export function purgeUrlFor(moduleKey: string, entityId: string): string | null {
  // Only entities with ?purge=1 support today
  switch (moduleKey) {
    case "customers":
      return `/api/customers/${entityId}?purge=1`;
    case "suppliers":
      return `/api/suppliers/${entityId}?purge=1`;
    case "products":
      return `/api/products/${entityId}?purge=1`;
    case "brands":
      return `/api/brands/${entityId}?purge=1`;
    case "categories":
      return `/api/categories/${entityId}?purge=1`;
    case "units":
      return `/api/units/${entityId}?purge=1`;
    case "warehouses":
      return `/api/werehouses/${entityId}?purge=1`;
    case "employees":
      return `/api/employees/${entityId}?purge=1`;
    case "invoice-templates":
      return `/api/invoice-templates/${entityId}?purge=1`;
    default:
      return null;
  }
}

export function detailHrefFor(
  moduleKey: string,
  entityId: string
): string | null {
  switch (moduleKey) {
    case "products":
      return `/dashboard/products/${entityId}`;
    case "customers":
      return `/dashboard/customers/${entityId}/edit`;
    case "suppliers":
      return `/dashboard/suppliers/${entityId}/edit`;
    case "sales":
      return `/dashboard/sales/${entityId}`;
    case "purchases":
      return `/dashboard/purchases/${entityId}`;
    case "invoices":
      return `/dashboard/invoices/${entityId}`;
    case "warehouses":
      return `/dashboard/werehouse/${entityId}`;
    case "employees":
      return `/dashboard/employees/${entityId}`;
    case "brands":
      return `/dashboard/brands/${entityId}/edit`;
    case "categories":
      return `/dashboard/category/${entityId}/edit`;
    case "units":
      return `/dashboard/units/${entityId}/edit`;
    case "invoice-templates":
      return `/dashboard/settings/templates/${entityId}`;
    default:
      return null;
  }
}

export function nameFromAuditValues(
  summary?: string | null,
  oldValue?: unknown,
  newValue?: unknown
): string {
  if (summary) {
    const cleaned = summary.replace(/^[^:]+:\s*/, "").trim();
    if (cleaned) return cleaned.slice(0, 200);
  }
  const ov = oldValue as Record<string, unknown> | null;
  const nv = newValue as Record<string, unknown> | null;
  const name =
    (ov && (ov.name || ov.fullName || ov.title || ov.sku || ov.code)) ||
    (nv && (nv.name || nv.fullName || nv.title || nv.sku || nv.code));
  if (typeof name === "string" && name.trim()) return name.slice(0, 200);
  return "Deleted record";
}
