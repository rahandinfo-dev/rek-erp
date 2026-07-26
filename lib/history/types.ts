/** Enterprise Navigation History / Recently Viewed */

export const HISTORY_LIMIT = 100;
export const HISTORY_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days
export const HISTORY_PREFIX = "rek-history:v1:";
export const WORKSPACE_KEY = "rek-workspace:v1:";

export type HistoryAction =
  | "viewed"
  | "edited"
  | "created"
  | "printed"
  | "downloaded";

export type HistoryModuleKey =
  | "products"
  | "sales"
  | "purchases"
  | "invoices"
  | "customers"
  | "suppliers"
  | "warehouses"
  | "employees"
  | "reports"
  | "settings"
  | "calculator"
  | "notifications"
  | "inventory"
  | "barcode"
  | "units"
  | "brands"
  | "categories"
  | "analytics"
  | "audit"
  | "drafts"
  | "favorites"
  | "general";

export const HISTORY_MODULE_LABELS: Record<string, string> = {
  products: "بەرهەمەکان",
  sales: "فرۆشتن",
  purchases: "کڕین",
  invoices: "پسوولەکان",
  customers: "کڕیارەکان",
  suppliers: "دابینکەران",
  warehouses: "کۆگاکان",
  employees: "کارمەندان",
  reports: "ڕاپۆرتەکان",
  settings: "ڕێکخستنەکان",
  calculator: "ژمێرەر",
  notifications: "ئاگادارییەکان",
  inventory: "ئینڤێنتۆری",
  barcode: "بارکۆد",
  units: "یەکەکان",
  brands: "براندەکان",
  categories: "پۆلەکان",
  analytics: "شیکاری",
  audit: "تۆماری چاودێری",
  drafts: "ناوەندی ڕەشنووس",
  favorites: "دڵخوازەکان",
  general: "گشتی",
};

export const HISTORY_FILTER_MODULES: HistoryModuleKey[] = [
  "products",
  "sales",
  "purchases",
  "invoices",
  "customers",
  "suppliers",
  "warehouses",
  "employees",
  "reports",
  "analytics",
  "settings",
];

export type HistoryItem = {
  version: 1;
  id: string;
  userId: string;
  companyId: string;
  moduleKey: string;
  entityType: string | null;
  entityId: string | null;
  href: string;
  title: string;
  subtitle: string | null;
  thumbnail: string | null;
  action: HistoryAction;
  pinned: boolean;
  openedAt: number;
  expiresAt: number | null;
  /** How many times this href was opened (insights) */
  visitCount?: number;
};

export type WorkspaceSnapshot = {
  version: 1;
  userId: string;
  companyId: string;
  pathname: string;
  search: string;
  tab: string | null;
  filters: Record<string, string>;
  sort: string | null;
  page: string | null;
  updatedAt: number;
};

export type HistoryGroupId =
  | "pinned"
  | "today"
  | "yesterday"
  | "week"
  | "month"
  | "older";

export type HistoryInsight = {
  moduleKey: string;
  label: string;
  title: string;
  href: string;
  count: number;
};

export function freshHistoryExpiry(pinned: boolean) {
  if (pinned) return null;
  return Date.now() + HISTORY_TTL_MS;
}

export function relativeOpened(ts: number) {
  const diff = Math.max(0, Date.now() - ts);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "ئێستا";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} minute${min === 1 ? "" : "s"} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  const d = Math.floor(hr / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

export function groupHistoryItems(items: HistoryItem[]) {
  const pinned = items.filter((i) => i.pinned);
  const rest = items.filter((i) => !i.pinned);
  const todayStart = startOfDay();
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
  const weekStart = todayStart - 7 * 24 * 60 * 60 * 1000;
  const monthStart = todayStart - 30 * 24 * 60 * 60 * 1000;

  const groups: { id: HistoryGroupId; label: string; items: HistoryItem[] }[] =
    [];

  if (pinned.length) {
    groups.push({ id: "pinned", label: "Pinned", items: pinned });
  }

  const today = rest.filter((i) => i.openedAt >= todayStart);
  const yesterday = rest.filter(
    (i) => i.openedAt >= yesterdayStart && i.openedAt < todayStart
  );
  const week = rest.filter(
    (i) => i.openedAt >= weekStart && i.openedAt < yesterdayStart
  );
  const month = rest.filter(
    (i) => i.openedAt >= monthStart && i.openedAt < weekStart
  );
  const older = rest.filter((i) => i.openedAt < monthStart);

  if (today.length) groups.push({ id: "today", label: "Today", items: today });
  if (yesterday.length)
    groups.push({ id: "yesterday", label: "Yesterday", items: yesterday });
  if (week.length)
    groups.push({ id: "week", label: "Last 7 Days", items: week });
  if (month.length)
    groups.push({ id: "month", label: "Last 30 Days", items: month });
  if (older.length) groups.push({ id: "older", label: "Older", items: older });

  return groups;
}

export function computeHistoryInsights(items: HistoryItem[]): HistoryInsight[] {
  const targets: Array<{ moduleKey: string; label: string }> = [
    { moduleKey: "products", label: "Most Viewed Product" },
    { moduleKey: "customers", label: "Most Viewed Customer" },
    { moduleKey: "reports", label: "Most Viewed Report" },
    { moduleKey: "warehouses", label: "Most Viewed Warehouse" },
    { moduleKey: "employees", label: "Most Viewed Employee" },
  ];

  return targets
    .map(({ moduleKey, label }) => {
      const pool = items.filter((i) => i.moduleKey === moduleKey);
      if (!pool.length) return null;
      const best = [...pool].sort(
        (a, b) => (b.visitCount || 1) - (a.visitCount || 1) || b.openedAt - a.openedAt
      )[0]!;
      return {
        moduleKey,
        label,
        title: best.title,
        href: best.href,
        count: best.visitCount || 1,
      };
    })
    .filter(Boolean) as HistoryInsight[];
}

export function moduleFromPath(pathname: string): HistoryModuleKey {
  const p = pathname;
  if (p.includes("/products")) return "products";
  if (p.includes("/sales")) return "sales";
  if (p.includes("/purchases")) return "purchases";
  if (p.includes("/invoices")) return "invoices";
  if (p.includes("/customers")) return "customers";
  if (p.includes("/suppliers")) return "suppliers";
  if (p.includes("/werehouse")) return "warehouses";
  if (p.includes("/employees")) return "employees";
  if (p.includes("/reports")) return "reports";
  if (p.includes("/settings")) return "settings";
  if (p.includes("/calculator")) return "calculator";
  if (p.includes("/notifications")) return "notifications";
  if (p.includes("/inventory")) return "inventory";
  if (p.includes("/barcode")) return "barcode";
  if (p.includes("/units")) return "units";
  if (p.includes("/brands")) return "brands";
  if (p.includes("/category")) return "categories";
  if (p.includes("/analytics")) return "analytics";
  if (p.includes("/audit-log")) return "audit";
  if (p.includes("/recovery")) return "drafts";
  return "general";
}

/** Parse entity pages worth tracking (skip list roots & new forms until created). */
export function parseHistoryTarget(pathname: string): {
  trackable: boolean;
  moduleKey: HistoryModuleKey;
  entityType: string | null;
  entityId: string | null;
  action: HistoryAction;
  href: string;
} | null {
  const moduleKey = moduleFromPath(pathname);
  const href = pathname.split("?")[0] || pathname;

  if (
    href === "/dashboard" ||
    href === "/dashboard/recent" ||
    href.endsWith("/new")
  ) {
    return null;
  }

  const editMatch = href.match(
    /^\/dashboard\/(products|sales|purchases|invoices|customers|suppliers|werehouse|employees|units|brands|category|settings\/templates)\/([^/]+)\/edit$/
  );
  if (editMatch) {
    return {
      trackable: true,
      moduleKey,
      entityType: editMatch[1] || null,
      entityId: editMatch[2] || null,
      action: "edited",
      href,
    };
  }

  const detailMatch = href.match(
    /^\/dashboard\/(products|sales|purchases|invoices|customers|suppliers|werehouse|employees|units|brands|category|settings\/templates)\/([^/]+)$/
  );
  if (detailMatch) {
    return {
      trackable: true,
      moduleKey,
      entityType: detailMatch[1] || null,
      entityId: detailMatch[2] || null,
      action: "viewed",
      href,
    };
  }

  if (
    [
      "/dashboard/reports",
      "/dashboard/calculator",
      "/dashboard/settings",
      "/dashboard/notifications",
      "/dashboard/barcode",
      "/dashboard/analytics",
      "/dashboard/inventory",
      "/dashboard/audit-log",
      "/dashboard/activity",
      "/dashboard/recovery",
      "/dashboard/drafts",
      "/dashboard/recycle-bin",
      "/dashboard/bulk",
      "/dashboard/settings/numbering",
      "/dashboard/version-history",
      "/dashboard/ai-assistant",
    ].includes(href)
  ) {
    return {
      trackable: true,
      moduleKey,
      entityType: moduleKey,
      entityId: null,
      action: "viewed",
      href,
    };
  }

  return null;
}

export function rankHistoryAction(
  a: HistoryAction,
  b: HistoryAction
): HistoryAction {
  const rank: Record<HistoryAction, number> = {
    created: 5,
    printed: 4,
    downloaded: 4,
    edited: 3,
    viewed: 1,
  };
  return rank[a] >= rank[b] ? a : b;
}
