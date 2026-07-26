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
  products: "بەرهەمەکان",
  sales: "فرۆشتن",
  purchases: "کڕین",
  invoices: "پسوولەکان",
  customers: "کڕیارەکان",
  suppliers: "دابینکەران",
  warehouses: "کۆگاکان",
  employees: "کارمەندان",
  expenses: "خەرجییەکان",
  categories: "پۆلەکان",
  brands: "براندەکان",
  units: "یەکەکان",
  reports: "ڕاپۆرتەکان",
};

export const BULK_ACTION_LABELS: Record<string, string> = {
  edit: "Bulk Edit",
  delete: "سڕینەوەی نەرم",
  restore: "گەڕاندنەوە",
  archive: "ئەرشیفکردن",
  unarchive: "دەرهێنان لە ئەرشیف",
  duplicate: "دووبارەکردنەوە",
  export_csv: "هەناردەی CSV",
  export_excel: "هەناردەی Excel",
  export_pdf: "هەناردەی PDF",
  print: "چاپکردن",
  move: "گواستنەوە",
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
