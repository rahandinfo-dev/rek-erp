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
  { key: "stat-today-sales", title: "Today's Sales", description: "Sales count today", category: "Stats", defaultSize: "small", defaultVisible: true },
  { key: "stat-today-revenue", title: "Today's Revenue", description: "Revenue today", category: "Stats", defaultSize: "small", defaultVisible: true },
  { key: "stat-today-purchases", title: "کڕینەکانی ئەمڕۆ", description: "Purchases today", category: "Stats", defaultSize: "small", defaultVisible: false },
  { key: "stat-products", title: "Total Products", description: "Active products", category: "Stats", defaultSize: "small", defaultVisible: true },
  { key: "stat-low-stock", title: "Low Stock", description: "Low stock alerts", category: "Stats", defaultSize: "small", defaultVisible: true },
  { key: "stat-out-of-stock", title: "کۆگا بەتاڵە", description: "Out of stock count", category: "Stats", defaultSize: "small", defaultVisible: false },
  { key: "recent-sales", title: "Recent Sales", description: "Latest sales", category: "Lists", defaultSize: "medium", defaultVisible: true },
  { key: "recent-purchases", title: "دوایین کڕینەکان", description: "Latest purchases", category: "Lists", defaultSize: "medium", defaultVisible: false },
  { key: "recent-customers", title: "دوایین کڕیارەکان", description: "Latest customers", category: "Lists", defaultSize: "medium", defaultVisible: false },
  { key: "recent-suppliers", title: "دوایین دابینکەران", description: "Latest suppliers", category: "Lists", defaultSize: "medium", defaultVisible: false },
  { key: "recent-products", title: "دوایین بەرهەمەکان", description: "Latest products", category: "Lists", defaultSize: "medium", defaultVisible: false },
  { key: "recent-invoices", title: "Recent Invoices", description: "Latest invoices", category: "Lists", defaultSize: "medium", defaultVisible: true },
  { key: "notifications", title: "ئاگادارییەکان", description: "Activity feed", category: "Alerts", defaultSize: "large", defaultVisible: true },
  { key: "quick-analytics", title: "Quick Analytics", description: "Charts overview", category: "Charts", defaultSize: "xlarge", defaultVisible: true },
  { key: "sales-chart", title: "Sales Chart", description: "Sales trend", category: "Charts", defaultSize: "large", defaultVisible: false },
  { key: "purchase-chart", title: "Purchase Chart", description: "Purchase trend", category: "Charts", defaultSize: "large", defaultVisible: false },
  { key: "revenue-chart", title: "Revenue Chart", description: "Revenue trend", category: "Charts", defaultSize: "large", defaultVisible: false },
  { key: "expense-chart", title: "Expense Chart", description: "Expense trend", category: "Charts", defaultSize: "large", defaultVisible: false },
  { key: "profit-chart", title: "Profit Chart", description: "Profit trend", category: "Charts", defaultSize: "large", defaultVisible: false },
  { key: "top-products", title: "زۆرترین فرۆشراوەکان", description: "Best sellers", category: "Insights", defaultSize: "medium", defaultVisible: false },
  { key: "top-customers", title: "Top Customers", description: "Top buyers", category: "Insights", defaultSize: "medium", defaultVisible: false },
  { key: "top-suppliers", title: "Top Suppliers", description: "Top suppliers", category: "Insights", defaultSize: "medium", defaultVisible: false },
  { key: "employee-alerts", title: "Employee Alerts", description: "HR alerts", category: "Alerts", defaultSize: "medium", defaultVisible: false },
  { key: "salary-alerts", title: "ئاگاداری مووچە", description: "Salary reminders", category: "Alerts", defaultSize: "medium", defaultVisible: false },
  { key: "audit-activity", title: "Recent Activity", description: "Enterprise activity timeline", category: "سیستەم", defaultSize: "medium", defaultVisible: true },
  { key: "my-activity", title: "My Activity", description: "Your recent actions", category: "سیستەم", defaultSize: "medium", defaultVisible: false },
  { key: "team-activity", title: "Team Activity", description: "Company-wide actions", category: "سیستەم", defaultSize: "medium", defaultVisible: false },
  { key: "failed-operations", title: "Failed Operations", description: "Failed audit events", category: "سیستەم", defaultSize: "medium", defaultVisible: false },
  { key: "recently-deleted", title: "Recently Deleted", description: "Latest Recycle Bin items", category: "سیستەم", defaultSize: "medium", defaultVisible: true },
  { key: "restore-suggestions", title: "Restore Suggestions", description: "Items worth restoring soon", category: "سیستەم", defaultSize: "medium", defaultVisible: false },
  { key: "recycle-bin-stats", title: "Recycle Bin Statistics", description: "Soft-delete stats", category: "سیستەم", defaultSize: "medium", defaultVisible: false },
  { key: "recent-bulk-ops", title: "Recent Bulk Operations", description: "Latest multi-record jobs", category: "سیستەم", defaultSize: "medium", defaultVisible: true },
  { key: "bulk-stats", title: "Bulk Statistics", description: "Bulk job counts", category: "سیستەم", defaultSize: "medium", defaultVisible: false },
  { key: "numbering-stats", title: "Numbering Statistics", description: "Auto-number counters", category: "سیستەم", defaultSize: "medium", defaultVisible: false },
  { key: "duplicate-detection", title: "Duplicate Detection", description: "SKU/barcode conflicts", category: "Alerts", defaultSize: "medium", defaultVisible: false },
  { key: "recent-changes", title: "Recent Changes", description: "Latest version history", category: "سیستەم", defaultSize: "medium", defaultVisible: true },
  { key: "most-edited-records", title: "Most Edited Records", description: "Records with most versions", category: "سیستەم", defaultSize: "medium", defaultVisible: false },
  { key: "restore-history", title: "Restore History", description: "Recent version restores", category: "سیستەم", defaultSize: "medium", defaultVisible: false },
  { key: "drafts", title: "Continue Working", description: "Resume last draft", category: "Productivity", defaultSize: "medium", defaultVisible: true },
  { key: "recent-drafts", title: "Recent Drafts", description: "Latest form drafts", category: "Productivity", defaultSize: "medium", defaultVisible: true },
  { key: "pinned-drafts", title: "Pinned Drafts", description: "Pinned unfinished work", category: "Productivity", defaultSize: "medium", defaultVisible: false },
  { key: "draft-stats", title: "Draft Statistics", description: "Draft counts", category: "Productivity", defaultSize: "medium", defaultVisible: false },
  { key: "recovery-status", title: "Recovery Status", description: "Session recovery health", category: "سیستەم", defaultSize: "small", defaultVisible: false },
  { key: "recently-viewed", title: "دوایین بینراوەکان", description: "مێژوو", category: "Productivity", defaultSize: "medium", defaultVisible: true },
  { key: "history-edited", title: "دوایین دەستکاریکراوەکان", description: "Edited records", category: "Productivity", defaultSize: "medium", defaultVisible: true },
  { key: "history-created", title: "دوایین دروستکراوەکان", description: "Created records", category: "Productivity", defaultSize: "medium", defaultVisible: true },
  { key: "favorites", title: "دڵخوازەکان", description: "Favorite pages", category: "Productivity", defaultSize: "medium", defaultVisible: true },
  { key: "quick-actions", title: "Quick Actions", description: "Create shortcuts", category: "Productivity", defaultSize: "xlarge", defaultVisible: true },
  { key: "active-alerts", title: "Active Alerts", description: "AI-generated alerts", category: "AI", defaultSize: "medium", defaultVisible: true },
  { key: "system-status", title: "System Status", description: "ERP health", category: "سیستەم", defaultSize: "small", defaultVisible: false },
  { key: "live-connection", title: "Live Connection", description: "Online status", category: "سیستەم", defaultSize: "small", defaultVisible: false },
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
  name = "Main Dashboard",
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
