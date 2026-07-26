import type { BulkAction, BulkModule } from "@/lib/bulk/types";

/** Actions enabled per module (enterprise matrix). */
export const MODULE_ACTIONS: Record<BulkModule, BulkAction[]> = {
  products: [
    "edit",
    "delete",
    "restore",
    "archive",
    "unarchive",
    "duplicate",
    "export_csv",
    "export_excel",
    "export_pdf",
    "print",
    "change_status",
    "assign_warehouse",
    "add_tags",
  ],
  sales: [
    "delete",
    "restore",
    "export_csv",
    "export_excel",
    "export_pdf",
    "print",
    "change_status",
    "add_tags",
  ],
  purchases: [
    "delete",
    "restore",
    "export_csv",
    "export_excel",
    "export_pdf",
    "print",
    "change_status",
    "assign_warehouse",
    "add_tags",
  ],
  invoices: [
    "delete",
    "restore",
    "duplicate",
    "export_csv",
    "export_excel",
    "export_pdf",
    "print",
    "change_status",
    "add_tags",
  ],
  customers: [
    "edit",
    "delete",
    "restore",
    "archive",
    "unarchive",
    "duplicate",
    "export_csv",
    "export_excel",
    "export_pdf",
    "print",
    "change_status",
    "add_tags",
  ],
  suppliers: [
    "edit",
    "delete",
    "restore",
    "archive",
    "unarchive",
    "duplicate",
    "export_csv",
    "export_excel",
    "export_pdf",
    "print",
    "change_status",
    "assign_category",
    "move",
    "add_tags",
  ],
  warehouses: [
    "edit",
    "delete",
    "restore",
    "archive",
    "unarchive",
    "export_csv",
    "export_excel",
    "change_status",
    "add_tags",
  ],
  employees: [
    "edit",
    "delete",
    "restore",
    "archive",
    "unarchive",
    "export_csv",
    "export_excel",
    "print",
    "change_status",
    "add_tags",
  ],
  expenses: ["export_csv", "export_excel", "add_tags"],
  categories: [
    "edit",
    "delete",
    "restore",
    "archive",
    "unarchive",
    "duplicate",
    "export_csv",
    "export_excel",
    "change_status",
    "add_tags",
  ],
  brands: [
    "edit",
    "delete",
    "restore",
    "archive",
    "unarchive",
    "duplicate",
    "export_csv",
    "export_excel",
    "change_status",
    "add_tags",
  ],
  units: [
    "edit",
    "delete",
    "restore",
    "archive",
    "unarchive",
    "duplicate",
    "export_csv",
    "export_excel",
    "change_status",
    "add_tags",
  ],
  reports: ["export_csv", "export_excel", "export_pdf", "print"],
};

export function entityTypeFor(moduleKey: string): string {
  switch (moduleKey) {
    case "products":
      return "Product";
    case "sales":
      return "Sale";
    case "purchases":
      return "Purchase";
    case "invoices":
      return "پسوولە";
    case "customers":
      return "کڕیار";
    case "suppliers":
      return "دابینکەر";
    case "warehouses":
      return "کۆگا";
    case "employees":
      return "کارمەند";
    case "categories":
      return "Category";
    case "brands":
      return "Brand";
    case "units":
      return "Unit";
    default:
      return moduleKey;
  }
}

export function isActionAllowed(moduleKey: string, action: string): boolean {
  const list = MODULE_ACTIONS[moduleKey as BulkModule];
  if (!list) return false;
  return list.includes(action as BulkAction);
}
