export const VERSION_ACTIONS = [
  "CREATE",
  "UPDATE",
  "RESTORE",
  "ARCHIVE",
  "UNARCHIVE",
  "DELETE",
] as const;

export type VersionAction = (typeof VERSION_ACTIONS)[number];

export const VERSION_ENTITY_TYPES = [
  "Product",
  "Sale",
  "Purchase",
  "Invoice",
  "Customer",
  "Supplier",
  "Warehouse",
  "Employee",
  "Expense",
  "Report",
  "Settings",
  "Company",
  "Category",
  "Brand",
  "Unit",
] as const;

export type VersionEntityType = (typeof VERSION_ENTITY_TYPES)[number] | string;

export type ChangedField = {
  field: string;
  before: unknown;
  after: unknown;
};

export type EntityVersionRow = {
  id: string;
  companyId: string;
  entityType: string;
  entityId: string;
  versionNumber: number;
  recordName: string;
  userId: string | null;
  userName: string | null;
  action: string;
  changedFields: ChangedField[];
  beforeValue: unknown;
  afterValue: unknown;
  comment: string | null;
  auditLogId: string | null;
  createdAt: string;
  date: string;
  time: string;
  href: string | null;
};

export type VersionQuery = {
  companyId: string;
  q?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  userId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
  sort?: "newest" | "oldest" | "version_asc" | "version_desc";
};

export const VERSION_ACTION_LABELS: Record<string, string> = {
  CREATE: "Create",
  UPDATE: "Update",
  RESTORE: "Restore",
  ARCHIVE: "Archive",
  UNARCHIVE: "Unarchive",
  DELETE: "Soft Delete",
};
