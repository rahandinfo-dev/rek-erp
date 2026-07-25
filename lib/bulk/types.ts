export const BULK_MODULES = [
  "products",
  "sales",
  "purchases",
  "invoices",
  "customers",
  "suppliers",
  "warehouses",
  "employees",
  "expenses",
  "categories",
  "brands",
  "units",
  "reports",
] as const;

export type BulkModule = (typeof BULK_MODULES)[number];

export const BULK_ACTIONS = [
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
  "move",
  "change_status",
  "assign_category",
  "assign_warehouse",
  "add_tags",
] as const;

export type BulkAction = (typeof BULK_ACTIONS)[number];

export type BulkJobStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled"
  | "partial";

export type BulkItemStatus =
  | "pending"
  | "processing"
  | "success"
  | "failed"
  | "skipped"
  | "cancelled";

export type BulkPayload = {
  /** Field patch for edit */
  fields?: Record<string, unknown>;
  /** Status value for change_status */
  status?: string;
  /** active true/false for master data */
  active?: boolean;
  categoryId?: string | null;
  warehouseId?: string | null;
  tags?: string[];
  /** Export format hint */
  format?: "csv" | "excel" | "pdf";
  reason?: string;
};

export type BulkJobSummary = {
  id: string;
  moduleKey: string;
  action: string;
  status: BulkJobStatus;
  totalCount: number;
  processedCount: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  cancelledCount: number;
  canUndo: boolean;
  undoneAt: number | null;
  cancelRequested: boolean;
  payload: BulkPayload | null;
  summary: Record<string, unknown> | null;
  exportRows?: Array<Record<string, string | number | null>>;
  items?: BulkJobItemView[];
  createdAt: number;
  startedAt: number | null;
  finishedAt: number | null;
};

export type BulkJobItemView = {
  id: string;
  entityId: string;
  entityLabel: string | null;
  status: BulkItemStatus;
  message: string | null;
};

export const BULK_MODULE_LABELS: Record<string, string> = {
  products: "Products",
  sales: "Sales",
  purchases: "Purchases",
  invoices: "Invoices",
  customers: "Customers",
  suppliers: "Suppliers",
  warehouses: "Warehouses",
  employees: "Employees",
  expenses: "Expenses",
  categories: "Categories",
  brands: "Brands",
  units: "Units",
  reports: "Reports",
};

export const BULK_ACTION_LABELS: Record<string, string> = {
  edit: "Bulk Edit",
  delete: "Soft Delete",
  restore: "Restore",
  archive: "Archive",
  unarchive: "Unarchive",
  duplicate: "Duplicate",
  export_csv: "Export CSV",
  export_excel: "Export Excel",
  export_pdf: "Export PDF",
  print: "Print",
  move: "Move",
  change_status: "Change Status",
  assign_category: "Assign Category",
  assign_warehouse: "Assign Warehouse",
  add_tags: "Add Tags",
};

export const DESTRUCTIVE_BULK_ACTIONS = new Set<BulkAction>([
  "delete",
  "archive",
  "change_status",
  "move",
]);

export const BATCH_SIZE = 15;
