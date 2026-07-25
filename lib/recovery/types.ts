/** Enterprise Session Recovery — shared types */

export const RECOVERY_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const RECOVERY_PREFIX = "rek-session:v1:";
export const RECOVERY_PENDING_KEY = "rek-session-pending-restore";
export const RECOVERY_DISMISS_KEY = "rek-session-welcome-dismissed";

export type ConnectionStatus = "online" | "syncing" | "offline";

export type RecoveryModuleKey =
  | "dashboard"
  | "products"
  | "inventory"
  | "warehouses"
  | "barcode"
  | "sales"
  | "purchases"
  | "invoices"
  | "customers"
  | "suppliers"
  | "employees"
  | "reports"
  | "settings"
  | "calculator"
  | "notifications"
  | "drafts"
  | "units"
  | "brands"
  | "categories"
  | "analytics"
  | "audit"
  | "general";

export const MODULE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  products: "Products",
  inventory: "Inventory",
  warehouses: "Warehouses",
  barcode: "Barcode",
  sales: "Sales",
  purchases: "Purchases",
  invoices: "Invoices",
  customers: "Customers",
  suppliers: "Suppliers",
  employees: "Employees",
  reports: "Reports",
  settings: "Settings",
  calculator: "Calculator",
  notifications: "Notifications",
  drafts: "Draft Center",
  units: "Units",
  brands: "Brands",
  categories: "Categories",
  analytics: "Analytics",
  audit: "Audit Log",
  general: "General",
  recovery: "Recovery Center",
};

export type EncryptedBlob = {
  v: 1;
  iv: string;
  data: string;
};

/** Sensitive UI payload — encrypted at rest */
export type RecoveryPayload = {
  pathname: string;
  search: string;
  scrollY: number;
  scrollX: number;
  activeElementId: string | null;
  selectionStart: number | null;
  selectionEnd: number | null;
  /** form field id/name → value (never passwords) */
  fields: Record<string, string | boolean | number | null>;
  /** expanded/collapsed section ids */
  expanded: string[];
  collapsed: string[];
  /** selected tab value if any */
  tab: string | null;
  draftKeys: string[];
  meta: Record<string, unknown>;
};

/** Safe summary for cards / Welcome Back details */
export type RecoverySummary = {
  moduleLabel: string;
  fieldsChanged: number;
  hasImage: boolean;
  hasWarehouse: boolean;
  hasCustomer: boolean;
  hasSupplier: boolean;
  hasEmployee: boolean;
  itemCount: number;
  notes: string[];
  draftStatus: "draft" | "empty" | "partial";
  estimatedMs: number;
};

export type SessionRecord = {
  version: 1;
  id: string;
  userId: string;
  companyId: string;
  moduleKey: string;
  title: string | null;
  pathname: string;
  search: string;
  /** Encrypted or plaintext fallback payload */
  payload: EncryptedBlob | RecoveryPayload;
  summary: RecoverySummary;
  createdAt: number;
  lastEditedAt: number;
  lastSavedAt: number;
  expiresAt: number;
  sizeBytes: number;
};

export function moduleKeyFromPath(pathname: string): RecoveryModuleKey {
  const p = pathname.replace(/\/+$/, "") || "/dashboard";
  if (p === "/dashboard") return "dashboard";
  if (p.includes("/products")) return "products";
  if (p.includes("/inventory")) return "inventory";
  if (p.includes("/werehouse")) return "warehouses";
  if (p.includes("/barcode")) return "barcode";
  if (p.includes("/sales")) return "sales";
  if (p.includes("/purchases")) return "purchases";
  if (p.includes("/invoices")) return "invoices";
  if (p.includes("/customers")) return "customers";
  if (p.includes("/suppliers")) return "suppliers";
  if (p.includes("/employees")) return "employees";
  if (p.includes("/reports")) return "reports";
  if (p.includes("/settings")) return "settings";
  if (p.includes("/calculator")) return "calculator";
  if (p.includes("/notifications")) return "notifications";
  if (p.includes("/recovery")) return "drafts";
  if (p.includes("/units")) return "units";
  if (p.includes("/brands")) return "brands";
  if (p.includes("/category")) return "categories";
  if (p.includes("/analytics")) return "analytics";
  if (p.includes("/audit-log")) return "audit";
  return "general";
}

const SENSITIVE_RE =
  /password|passwd|pwd|token|secret|otp|authorization|cookie|ssn|credit/i;

export function isSensitiveField(name: string): boolean {
  return SENSITIVE_RE.test(name);
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function relativeTime(ts: number) {
  const diff = Math.max(0, Date.now() - ts);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} minute${min === 1 ? "" : "s"} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  const d = Math.floor(hr / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}
