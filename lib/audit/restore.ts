import type { AuditLogRow } from "@/lib/audit/query";

/** Map entity types to soft-delete restore API paths. */
export function restoreApiFor(row: Pick<AuditLogRow, "entityType" | "entityId" | "action" | "module">): string | null {
  if (!row.entityId) return null;
  if (row.action !== "DELETE" && row.action !== "UPDATE") return null;

  const type = (row.entityType || row.module || "").toLowerCase();
  const id = row.entityId;

  if (type.includes("product")) return `/api/products/${id}/restore`;
  if (type.includes("customer")) return `/api/customers/${id}/restore`;
  if (type.includes("supplier")) return `/api/suppliers/${id}/restore`;
  if (type.includes("sale")) return `/api/sales/${id}/restore`;
  if (type.includes("purchase")) return `/api/purchases/${id}/restore`;
  if (type.includes("invoice")) return `/api/invoices/${id}/restore`;
  if (type.includes("warehouse") || type.includes("werehouse"))
    return `/api/werehouses/${id}/restore`;
  if (type.includes("employee")) return `/api/employees/${id}/restore`;
  if (type.includes("brand")) return `/api/brands/${id}/restore`;
  if (type.includes("categor")) return `/api/categories/${id}/restore`;
  if (type.includes("unit")) return `/api/units/${id}/restore`;

  return null;
}

export function recordHrefFor(row: Pick<AuditLogRow, "entityType" | "entityId" | "module" | "action">): string | null {
  if (!row.entityId) return null;
  const type = (row.entityType || row.module || "").toLowerCase();
  const id = row.entityId;
  if (type.includes("product")) return `/dashboard/products/${id}`;
  if (type.includes("customer")) return `/dashboard/customers/${id}/edit`;
  if (type.includes("supplier")) return `/dashboard/suppliers/${id}/edit`;
  if (type.includes("sale")) return `/dashboard/sales/${id}`;
  if (type.includes("purchase")) return `/dashboard/purchases/${id}`;
  if (type.includes("invoice")) return `/dashboard/invoices/${id}`;
  if (type.includes("warehouse") || type.includes("werehouse"))
    return `/dashboard/werehouse/${id}`;
  if (type.includes("employee")) return `/dashboard/employees/${id}`;
  if (type.includes("brand")) return `/dashboard/brands/${id}/edit`;
  if (type.includes("categor")) return `/dashboard/category/${id}/edit`;
  if (type.includes("unit")) return `/dashboard/units/${id}/edit`;
  return null;
}

export function canRestoreVersion(row: Pick<AuditLogRow, "oldValue" | "action">) {
  return Boolean(row.oldValue) && ["UPDATE", "DELETE", "RESTORE"].includes(row.action);
}
