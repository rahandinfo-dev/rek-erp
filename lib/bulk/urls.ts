/** Map module + entity to soft-delete / restore HTTP endpoints. */
export function deleteUrlFor(moduleKey: string, entityId: string): string | null {
  switch (moduleKey) {
    case "products":
      return `/api/products/${entityId}`;
    case "customers":
      return `/api/customers/${entityId}`;
    case "suppliers":
      return `/api/suppliers/${entityId}`;
    case "warehouses":
      return `/api/werehouses/${entityId}`;
    case "categories":
      return `/api/categories/${entityId}`;
    case "brands":
      return `/api/brands/${entityId}`;
    case "units":
      return `/api/units/${entityId}`;
    case "employees":
      return `/api/employees/${entityId}`;
    case "sales":
      return `/api/sales/${entityId}`;
    case "purchases":
      return `/api/purchases/${entityId}`;
    case "invoices":
      return `/api/invoices/${entityId}`;
    default:
      return null;
  }
}

export function restoreUrlFor(moduleKey: string, entityId: string): string | null {
  switch (moduleKey) {
    case "products":
      return `/api/products/${entityId}/restore`;
    case "customers":
      return `/api/customers/${entityId}/restore`;
    case "suppliers":
      return `/api/suppliers/${entityId}/restore`;
    case "warehouses":
      return `/api/werehouses/${entityId}/restore`;
    case "categories":
      return `/api/categories/${entityId}/restore`;
    case "brands":
      return `/api/brands/${entityId}/restore`;
    case "units":
      return `/api/units/${entityId}/restore`;
    case "employees":
      return `/api/employees/${entityId}/restore`;
    case "sales":
      return `/api/sales/${entityId}/restore`;
    case "purchases":
      return `/api/purchases/${entityId}/restore`;
    case "invoices":
      return `/api/invoices/${entityId}/restore`;
    default:
      return null;
  }
}
