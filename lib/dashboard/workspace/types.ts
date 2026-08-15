/** Enterprise Dashboard Workspace */

export const DASHBOARD_WS_PREFIX = "rek-dashboard-ws:v2:";

export type WidgetSize = "small" | "medium" | "large" | "xlarge";

export type RefreshInterval =
  | 0
  | 30
  | 60
  | 300
  | 900
  | 1800;

export type WidgetDisplayMode = "default" | "compact" | "detailed";

export type ChartType = "bar" | "line" | "area" | "pie";

export type WidgetColorTheme =
  | "default"
  | "blue"
  | "green"
  | "orange"
  | "purple"
  | "red";

export type WidgetSettings = {
  refreshInterval: RefreshInterval;
  displayMode: WidgetDisplayMode;
  chartType: ChartType;
  sortOrder: "asc" | "desc" | "recent";
  itemCount: number;
  colorTheme: WidgetColorTheme;
  compactMode: boolean;
};

export type WidgetInstance = {
  id: string;
  widgetKey: string;
  size: WidgetSize;
  pinned: boolean;
  favorite: boolean;
  hidden: boolean;
  collapsed: boolean;
  order: number;
  settings: WidgetSettings;
};

export type DashboardLayout = {
  id: string;
  name: string;
  sortOrder: number;
  isDefault: boolean;
  isActive: boolean;
  widgets: WidgetInstance[];
  updatedAt: number;
};

export type DashboardWorkspaceBundle = {
  version: 1;
  userId: string;
  companyId: string;
  dashboards: DashboardLayout[];
  updatedAt: number;
};

export const DEFAULT_WIDGET_SETTINGS: WidgetSettings = {
  refreshInterval: 0,
  displayMode: "default",
  chartType: "bar",
  sortOrder: "recent",
  itemCount: 5,
  colorTheme: "default",
  compactMode: false,
};

export const SIZE_COLS: Record<WidgetSize, number> = {
  small: 3,
  medium: 4,
  large: 6,
  xlarge: 12,
};

export type WidgetCatalogEntry = {
  key: string;
  title: string;
  description: string;
  category: string;
  defaultSize: WidgetSize;
  defaultVisible: boolean;
};

export const WIDGET_CATALOG: WidgetCatalogEntry[] = [
  { key: "stat-today-sales", title: "فرۆشتنی ئەمڕۆ", description: "ژمارەی فرۆشتنی ئەمڕۆ", category: "ئامار", defaultSize: "small", defaultVisible: true },
  { key: "stat-today-revenue", title: "داهاتی ئەمڕۆ", description: "داهاتی ئەمڕۆ", category: "ئامار", defaultSize: "small", defaultVisible: true },
  { key: "stat-today-purchases", title: "کڕینەکانی ئەمڕۆ", description: "کڕینەکانی ئەمڕۆ", category: "ئامار", defaultSize: "small", defaultVisible: false },
  { key: "stat-products", title: "کۆی بەرهەمەکان", description: "بەرهەمە چالاکەکان", category: "ئامار", defaultSize: "small", defaultVisible: true },
  { key: "stat-low-stock", title: "کۆگای کەم", description: "ئاگاداری کۆگای کەم", category: "ئامار", defaultSize: "small", defaultVisible: true },
  { key: "stat-out-of-stock", title: "کۆگا بەتاڵە", description: "ژمارەی کۆگای بەتاڵ", category: "ئامار", defaultSize: "small", defaultVisible: false },
  { key: "recent-sales", title: "دوایین فرۆشتنەکان", description: "نوێترین فرۆشتنەکان", category: "لیستەکان", defaultSize: "medium", defaultVisible: true },
  { key: "recent-purchases", title: "دوایین کڕینەکان", description: "نوێترین کڕینەکان", category: "لیستەکان", defaultSize: "medium", defaultVisible: false },
  { key: "recent-customers", title: "دوایین کڕیارەکان", description: "نوێترین کڕیارەکان", category: "لیستەکان", defaultSize: "medium", defaultVisible: false },
  { key: "recent-suppliers", title: "دوایین دابینکەران", description: "نوێترین دابینکەران", category: "لیستەکان", defaultSize: "medium", defaultVisible: false },
  { key: "recent-products", title: "دوایین بەرهەمەکان", description: "نوێترین بەرهەمەکان", category: "لیستەکان", defaultSize: "medium", defaultVisible: false },
  { key: "recent-invoices", title: "دوایین پسوولەکان", description: "نوێترین پسوولەکان", category: "لیستەکان", defaultSize: "medium", defaultVisible: true },
  { key: "notifications", title: "ئاگادارییەکان", description: "خۆراکی چالاکی", category: "ئاگاداری", defaultSize: "large", defaultVisible: true },
  { key: "quick-analytics", title: "شیکاری خێرا", description: "پوختەی هێڵکاری", category: "هێڵکاری", defaultSize: "xlarge", defaultVisible: true },
  { key: "sales-chart", title: "هێڵکاری فرۆشتن", description: "ڕەوتی فرۆشتن", category: "هێڵکاری", defaultSize: "large", defaultVisible: false },
  { key: "purchase-chart", title: "هێڵکاری کڕین", description: "ڕەوتی کڕین", category: "هێڵکاری", defaultSize: "large", defaultVisible: false },
  { key: "revenue-chart", title: "هێڵکاری داهات", description: "ڕەوتی داهات", category: "هێڵکاری", defaultSize: "large", defaultVisible: false },
  { key: "expense-chart", title: "هێڵکاری خەرجی", description: "ڕەوتی خەرجی", category: "هێڵکاری", defaultSize: "large", defaultVisible: false },
  { key: "profit-chart", title: "هێڵکاری قازانج", description: "ڕەوتی قازانج", category: "هێڵکاری", defaultSize: "large", defaultVisible: false },
  { key: "top-products", title: "زۆرترین فرۆشراوەکان", description: "باشترین فرۆشراوەکان", category: "تێڕوانین", defaultSize: "medium", defaultVisible: false },
  { key: "top-customers", title: "باشترین کڕیارەکان", description: "زۆرترین کڕیارەکان", category: "تێڕوانین", defaultSize: "medium", defaultVisible: false },
  { key: "top-suppliers", title: "باشترین دابینکەران", description: "زۆرترین دابینکەران", category: "تێڕوانین", defaultSize: "medium", defaultVisible: false },
  { key: "employee-alerts", title: "ئاگاداری کارمەند", description: "ئاگادارییەکانی کارمەندان", category: "ئاگاداری", defaultSize: "medium", defaultVisible: false },
  { key: "salary-alerts", title: "ئاگاداری مووچە", description: "بیرخستنەوەی مووچە", category: "ئاگاداری", defaultSize: "medium", defaultVisible: false },
  { key: "audit-activity", title: "دوایین چالاکی", description: "کاتی چالاکی سیستەم", category: "سیستەم", defaultSize: "medium", defaultVisible: true },
  { key: "my-activity", title: "چالاکییەکانی من", description: "دوایین کردارەکانت", category: "سیستەم", defaultSize: "medium", defaultVisible: false },
  { key: "team-activity", title: "چالاکی تیم", description: "کردارەکانی کۆمپانیا", category: "سیستەم", defaultSize: "medium", defaultVisible: false },
  { key: "failed-operations", title: "کردارە سەرنەکەوتووەکان", description: "ڕووداوە سەرنەکەوتووەکان", category: "سیستەم", defaultSize: "medium", defaultVisible: false },
  { key: "recently-deleted", title: "دوایین سڕاوەکان", description: "سەبەتەی خۆڵ", category: "سیستەم", defaultSize: "medium", defaultVisible: true },
  { key: "restore-suggestions", title: "پێشنیاری گەڕاندنەوە", description: "بڕگە گونجاوەکان بۆ گەڕاندنەوە", category: "سیستەم", defaultSize: "medium", defaultVisible: false },
  { key: "recycle-bin-stats", title: "ئاماری سەبەتەی خۆڵ", description: "ئاماری سڕینەوەی نەرم", category: "سیستەم", defaultSize: "medium", defaultVisible: false },
  { key: "recent-bulk-ops", title: "دوایین کرداری کۆمەڵایەتی", description: "دوایین کارە کۆمەڵایەتییەکان", category: "سیستەم", defaultSize: "medium", defaultVisible: true },
  { key: "bulk-stats", title: "ئاماری کرداری کۆمەڵایەتی", description: "ژمارەی کارە کۆمەڵایەتییەکان", category: "سیستەم", defaultSize: "medium", defaultVisible: false },
  { key: "numbering-stats", title: "ئاماری ژمارەکردنەوە", description: "ژمارەکارە خۆکارەکان", category: "سیستەم", defaultSize: "medium", defaultVisible: false },
  { key: "duplicate-detection", title: "دۆزینەوەی دووبارە", description: "ناکۆکی SKU / بارکۆد", category: "ئاگاداری", defaultSize: "medium", defaultVisible: false },
  { key: "recent-changes", title: "دوایین گۆڕانکارییەکان", description: "مێژووی وەشان", category: "سیستەم", defaultSize: "medium", defaultVisible: true },
  { key: "most-edited-records", title: "زۆرترین دەستکاریکراوەکان", description: "تۆمارە پڕوەشانەکان", category: "سیستەم", defaultSize: "medium", defaultVisible: false },
  { key: "restore-history", title: "مێژووی گەڕاندنەوە", description: "گەڕاندنەوەی وەشان", category: "سیستەم", defaultSize: "medium", defaultVisible: false },
  { key: "drafts", title: "بەردەوامبوون لە کار", description: "گەڕانەوە بۆ دوایین ڕەشنووس", category: "بەرهەمدارێتی", defaultSize: "medium", defaultVisible: true },
  { key: "recent-drafts", title: "دوایین ڕەشنووسەکان", description: "دوایین فۆرمە ناتەواوەکان", category: "بەرهەمدارێتی", defaultSize: "medium", defaultVisible: true },
  { key: "pinned-drafts", title: "ڕەشنووسی هەڵواسراو", description: "کارە هەڵواسراوەکان", category: "بەرهەمدارێتی", defaultSize: "medium", defaultVisible: false },
  { key: "draft-stats", title: "ئاماری ڕەشنووس", description: "ژمارەی ڕەشنووسەکان", category: "بەرهەمدارێتی", defaultSize: "medium", defaultVisible: false },
  { key: "recovery-status", title: "دۆخی گەڕاندنەوە", description: "تەندروستی دانیشتن", category: "سیستەم", defaultSize: "small", defaultVisible: false },
  { key: "recently-viewed", title: "دوایین بینراوەکان", description: "مێژوو", category: "بەرهەمدارێتی", defaultSize: "medium", defaultVisible: true },
  { key: "history-edited", title: "دوایین دەستکاریکراوەکان", description: "تۆمارە دەستکاریکراوەکان", category: "بەرهەمدارێتی", defaultSize: "medium", defaultVisible: true },
  { key: "history-created", title: "دوایین دروستکراوەکان", description: "تۆمارە دروستکراوەکان", category: "بەرهەمدارێتی", defaultSize: "medium", defaultVisible: true },
  { key: "favorites", title: "دڵخوازەکان", description: "لاپەڕە دڵخوازەکان", category: "بەرهەمدارێتی", defaultSize: "medium", defaultVisible: true },
  { key: "quick-actions", title: "کرداری خێرا", description: "کورتەڕێی دروستکردن", category: "بەرهەمدارێتی", defaultSize: "xlarge", defaultVisible: true },
  { key: "system-status", title: "دۆخی سیستەم", description: "تەندروستی ERP", category: "سیستەم", defaultSize: "small", defaultVisible: false },
  { key: "live-connection", title: "پەیوەندی ڕاستەوخۆ", description: "دۆخی ئۆنلاین", category: "سیستەم", defaultSize: "small", defaultVisible: false },
];

export function catalogByKey(key: string) {
  return WIDGET_CATALOG.find((w) => w.key === key);
}

const VALID_WIDGET_KEYS = new Set(WIDGET_CATALOG.map((c) => c.key));

/** Drop widgets removed from the catalog (e.g. after a product cleanup). */
export function pruneUnknownWidgets(
  bundle: DashboardWorkspaceBundle
): DashboardWorkspaceBundle {
  let changed = false;
  const dashboards = bundle.dashboards.map((d) => {
    const widgets = d.widgets.filter((w) => VALID_WIDGET_KEYS.has(w.widgetKey));
    if (widgets.length !== d.widgets.length) {
      changed = true;
      return { ...d, widgets };
    }
    return d;
  });
  return changed ? { ...bundle, dashboards } : bundle;
}

export function defaultWidgetSettings(
  patch?: Partial<WidgetSettings>
): WidgetSettings {
  return { ...DEFAULT_WIDGET_SETTINGS, ...patch };
}

export function buildDefaultWidgets(): WidgetInstance[] {
  return WIDGET_CATALOG.map((c, idx) => ({
    id: `w_${c.key}`,
    widgetKey: c.key,
    size: c.defaultSize,
    pinned: false,
    favorite: false,
    hidden: !c.defaultVisible,
    collapsed: false,
    order: idx,
    settings: defaultWidgetSettings(),
  }));
}

export function newDashId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `dash_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function buildDefaultDashboard(
  _userId: string,
  _companyId: string,
  name = "داشبۆردی سەرەکی",
  id?: string
): DashboardLayout {
  return {
    id: id || newDashId(),
    name,
    sortOrder: 0,
    isDefault: true,
    isActive: true,
    widgets: buildDefaultWidgets(),
    updatedAt: Date.now(),
  };
}

export function emptyBundle(
  userId: string,
  companyId: string
): DashboardWorkspaceBundle {
  const dash = buildDefaultDashboard(userId, companyId);
  return {
    version: 1,
    userId,
    companyId,
    dashboards: [dash],
    updatedAt: Date.now(),
  };
}
