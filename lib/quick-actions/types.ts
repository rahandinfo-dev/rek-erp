import type { BulkModule } from "@/lib/bulk/types";

export const QUICK_ACTION_MODULES = [
  "products",
  "sales",
  "purchases",
  "invoices",
  "customers",
  "suppliers",
  "warehouses",
  "employees",
  "reports",
  "expenses",
  "categories",
] as const;

export type QuickActionModule = (typeof QUICK_ACTION_MODULES)[number];

export const QUICK_ACTION_IDS = [
  "view",
  "edit",
  "duplicate",
  "copy",
  "move",
  "archive",
  "unarchive",
  "soft_delete",
  "restore",
  "print",
  "export_pdf",
  "export_excel",
  "export_csv",
  "share",
  "copy_link",
  "open_new_tab",
  "favorite",
  "pin",
  "timeline",
  "audit",
] as const;

export type QuickActionId = (typeof QUICK_ACTION_IDS)[number];

export type QuickActionGroup =
  | "navigate"
  | "mutate"
  | "export"
  | "share"
  | "meta"
  | "advanced";

export type QuickActionDef = {
  id: QuickActionId;
  label: string;
  group: QuickActionGroup;
  /** Confirm before run */
  destructive?: boolean;
  /** Load on demand (advanced section) */
  lazy?: boolean;
  /** Keyboard shortcut chord (display + handler) */
  shortcut?: string;
  /** Bulk action key when mapped */
  bulkAction?: string;
  /** Permission key — hidden when denied */
  permission?: string;
};

export type QuickActionRecord = {
  id: string;
  moduleKey: QuickActionModule | BulkModule | string;
  label: string;
  href?: string;
  editHref?: string;
  entityType?: string;
  deleted?: boolean;
  archived?: boolean;
  pinned?: boolean;
  meta?: Record<string, unknown>;
};

export type QuickActionPrefs = {
  version: 1;
  userId: string;
  companyId: string;
  /** Global pinned action ids (appear first in toolbar/menu) */
  pinnedIds: QuickActionId[];
  /** Globally hidden action ids */
  hiddenIds: QuickActionId[];
  /** Per-module custom order (overrides default) */
  orderByModule: Partial<Record<string, QuickActionId[]>>;
  updatedAt: number;
};

export type ContextMenuState = {
  open: boolean;
  x: number;
  y: number;
  records: QuickActionRecord[];
  moduleKey: string;
};

export type PendingConfirm = {
  actionId: QuickActionId;
  records: QuickActionRecord[];
  moduleKey: string;
  title: string;
  description: string;
};
