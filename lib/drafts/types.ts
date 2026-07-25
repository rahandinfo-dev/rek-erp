export type AutoSaveStatus =
  | "idle"
  | "saving"
  | "saved"
  | "offline"
  | "waiting"
  | "restored"
  | "failed"
  | "unsaved";

export type DraftCenterStatus =
  | "draft"
  | "saving"
  | "saved"
  | "failed"
  | "recovered"
  | "completed"
  | "archived";

/** Optional Draft Center metadata mirrored with the payload. */
export type DraftMeta = {
  title?: string;
  status?: DraftCenterStatus;
  pinned?: boolean;
  archived?: boolean;
  moduleKey?: string;
  device?: string;
  progress?: number;
  tags?: string[];
  shareToken?: string | null;
  createdAt?: number;
};

/** Draft payload persisted locally (and optionally mirrored server-side). */
export type DraftRecord<T> = {
  version: 2;
  key: string;
  userId: string;
  companyId: string;
  savedAt: number;
  expiresAt: number;
  data: T;
  meta?: DraftMeta;
};

export const DRAFT_PREFIX = "rek-draft:v2:";
export const DRAFT_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export const DRAFT_KEYS = {
  saleNew: "sale:new",
  purchaseNew: "purchase:new",
  productNew: "product:new",
  productEdit: "product:edit",
  companySettings: "company:settings",
  employeeNew: "employee:new",
  employeeEdit: "employee:edit",
  customerNew: "customer:new",
  customerEdit: "customer:edit",
  supplierNew: "supplier:new",
  supplierEdit: "supplier:edit",
  warehouseNew: "warehouse:new",
  warehouseEdit: "warehouse:edit",
  reportsFilters: "reports:filters",
  calculator: "calculator:state",
  brandNew: "brand:new",
  brandEdit: "brand:edit",
  categoryNew: "category:new",
  categoryEdit: "category:edit",
  unitNew: "unit:new",
  unitEdit: "unit:edit",
} as const;

export type DraftKey = (typeof DRAFT_KEYS)[keyof typeof DRAFT_KEYS] | string;
