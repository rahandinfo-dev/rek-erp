import type { VersionEntityType } from "@/lib/versions/types";

export function versionRecordHref(
  entityType: string,
  entityId: string
): string | null {
  const type = entityType.toLowerCase();
  if (type.includes("product")) return `/dashboard/products/${entityId}`;
  if (type.includes("customer")) return `/dashboard/customers/${entityId}/edit`;
  if (type.includes("supplier")) return `/dashboard/suppliers/${entityId}/edit`;
  if (type.includes("sale")) return `/dashboard/sales/${entityId}`;
  if (type.includes("purchase")) return `/dashboard/purchases/${entityId}`;
  if (type.includes("invoice")) return `/dashboard/invoices/${entityId}`;
  if (type.includes("warehouse") || type.includes("werehouse"))
    return `/dashboard/werehouse/${entityId}`;
  if (type.includes("employee")) return `/dashboard/employees/${entityId}`;
  if (type.includes("categor")) return `/dashboard/category/${entityId}/edit`;
  if (type.includes("brand")) return `/dashboard/brands/${entityId}/edit`;
  if (type.includes("unit")) return `/dashboard/units/${entityId}/edit`;
  if (type.includes("setting") || type.includes("company"))
    return `/dashboard/settings`;
  if (type.includes("report") || type.includes("expense"))
    return `/dashboard/reports`;
  return null;
}

export function versionPageHref(versionId: string): string {
  return `/dashboard/version-history?id=${encodeURIComponent(versionId)}`;
}

export function versionEntityPageHref(
  entityType: string,
  entityId: string
): string {
  return `/dashboard/version-history?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`;
}

export function normalizeEntityType(raw: string): VersionEntityType {
  const t = raw.toLowerCase();
  if (t.includes("product")) return "Product";
  if (t.includes("customer")) return "کڕیار";
  if (t.includes("supplier")) return "دابینکەر";
  if (t.includes("sale")) return "Sale";
  if (t.includes("purchase")) return "Purchase";
  if (t.includes("invoice")) return "پسوولە";
  if (t.includes("warehouse") || t.includes("werehouse")) return "کۆگا";
  if (t.includes("employee")) return "کارمەند";
  if (t.includes("expense")) return "Expense";
  if (t.includes("report")) return "Report";
  if (t.includes("setting") || t.includes("company")) return "ڕێکخستنەکان";
  if (t.includes("categor")) return "Category";
  if (t.includes("brand")) return "Brand";
  if (t.includes("unit")) return "Unit";
  return raw;
}
