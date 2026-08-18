import {
  Banknote, Barcode, Bell, Boxes, Calculator, ChartColumnIncreasing, FileText,
  History, IdCard, Info, LayoutDashboard, Package, Printer, Ruler, Settings,
  Shield, ShoppingBasket, ShoppingCart, Sparkles, Truck, Users, WalletCards,
  Warehouse, type LucideIcon,
} from "lucide-react";
import { isNavigationVisible } from "@/lib/navigation/visibility";

export type NavigationGroup =
  | "home"
  | "inventory"
  | "trading"
  | "people"
  | "insights"
  | "system";

/**
 * The single source of truth for every ERP navigation presentation.  A
 * renderer may arrange these items differently, but it must never invent a
 * second list of routes.
 */
export type NavigationItem = {
  id: string;
  href: string;
  labelKey: string;
  descriptionKey?: string;
  icon: LucideIcon;
  group: NavigationGroup;
  order: number;
};

export const NAVIGATION_GROUP_LABELS: Record<NavigationGroup, string> = {
  home: "nav.home",
  inventory: "nav.inventoryGroup",
  trading: "nav.tradingGroup",
  people: "nav.peopleGroup",
  insights: "nav.insightsGroup",
  system: "nav.systemGroup",
};

export const NAVIGATION_REGISTRY: readonly NavigationItem[] = [
  { id: "payment", href: "/dashboard/payment-online", labelKey: "nav.paymentOnline", icon: WalletCards, group: "home", order: 1 },
  { id: "dashboard", href: "/dashboard", labelKey: "nav.dashboard", descriptionKey: "nav.descHome", icon: LayoutDashboard, group: "home", order: 2 },
  { id: "currency", href: "/dashboard/currency", labelKey: "nav.currency", descriptionKey: "nav.descCurrency", icon: Banknote, group: "home", order: 3 },
  { id: "inventory", href: "/dashboard/inventory", labelKey: "nav.inventory", descriptionKey: "nav.descInventory", icon: Warehouse, group: "inventory", order: 10 },
  { id: "inventory-adjustments", href: "/dashboard/inventory/adjustments", labelKey: "nav.inventoryAdjustments", descriptionKey: "nav.descAdjustments", icon: Boxes, group: "inventory", order: 11 },
  { id: "inventory-transfers", href: "/dashboard/inventory/transfers", labelKey: "nav.inventoryTransfers", descriptionKey: "nav.descTransfers", icon: Boxes, group: "inventory", order: 12 },
  { id: "products", href: "/dashboard/products", labelKey: "nav.products", descriptionKey: "nav.descProducts", icon: Package, group: "inventory", order: 13 },
  { id: "warehouses", href: "/dashboard/werehouse", labelKey: "nav.warehouse", descriptionKey: "nav.descWarehouse", icon: Boxes, group: "inventory", order: 14 },
  { id: "units", href: "/dashboard/units", labelKey: "nav.units", descriptionKey: "nav.descUnits", icon: Ruler, group: "inventory", order: 15 },
  { id: "barcode", href: "/dashboard/barcode", labelKey: "nav.barcode", descriptionKey: "nav.descBarcode", icon: Barcode, group: "inventory", order: 16 },
  { id: "sales", href: "/dashboard/sales", labelKey: "nav.sales", descriptionKey: "nav.descSales", icon: ShoppingCart, group: "trading", order: 20 },
  { id: "purchases", href: "/dashboard/purchases", labelKey: "nav.purchases", descriptionKey: "nav.descPurchases", icon: ShoppingBasket, group: "trading", order: 21 },
  { id: "invoices", href: "/dashboard/invoices", labelKey: "nav.invoices", descriptionKey: "nav.descInvoices", icon: FileText, group: "trading", order: 22 },
  { id: "customers", href: "/dashboard/customers", labelKey: "nav.customers", descriptionKey: "nav.descCustomers", icon: Users, group: "trading", order: 23 },
  { id: "suppliers", href: "/dashboard/suppliers", labelKey: "nav.suppliers", descriptionKey: "nav.descSuppliers", icon: Truck, group: "trading", order: 24 },
  { id: "employees", href: "/dashboard/employees", labelKey: "nav.employees", descriptionKey: "nav.descEmployees", icon: IdCard, group: "people", order: 30 },
  { id: "employee-reports", href: "/dashboard/employees/reports", labelKey: "nav.employeeReports", descriptionKey: "nav.descEmployeeReports", icon: ChartColumnIncreasing, group: "people", order: 31 },
  { id: "analytics", href: "/dashboard/analytics", labelKey: "nav.analytics", descriptionKey: "nav.descAnalytics", icon: ChartColumnIncreasing, group: "insights", order: 40 },
  { id: "reports", href: "/dashboard/reports", labelKey: "nav.reports", descriptionKey: "nav.descReports", icon: ChartColumnIncreasing, group: "insights", order: 41 },
  { id: "activity", href: "/dashboard/activity", labelKey: "nav.activity", descriptionKey: "nav.descActivity", icon: History, group: "insights", order: 42 },
  { id: "audit", href: "/dashboard/audit-log", labelKey: "nav.auditLog", descriptionKey: "nav.descAudit", icon: Shield, group: "insights", order: 43 },
  { id: "ai", href: "/dashboard/ai-assistant", labelKey: "nav.aiAssistant", descriptionKey: "nav.descAi", icon: Sparkles, group: "insights", order: 44 },
  { id: "notifications", href: "/dashboard/notifications", labelKey: "nav.notifications", descriptionKey: "nav.descNotifications", icon: Bell, group: "system", order: 50 },
  { id: "recent", href: "/dashboard/recent", labelKey: "nav.recent", descriptionKey: "nav.descRecent", icon: History, group: "system", order: 51 },
  { id: "drafts", href: "/dashboard/drafts", labelKey: "nav.drafts", descriptionKey: "nav.descDrafts", icon: History, group: "system", order: 52 },
  { id: "archive", href: "/dashboard/recycle-bin", labelKey: "nav.recycleBin", descriptionKey: "nav.descRecycleBin", icon: History, group: "system", order: 53 },
  { id: "recovery", href: "/dashboard/recovery", labelKey: "nav.recovery", descriptionKey: "nav.descRecovery", icon: History, group: "system", order: 54 },
  { id: "print", href: "/dashboard/print-center", labelKey: "nav.printCenter", descriptionKey: "nav.descPrint", icon: Printer, group: "system", order: 55 },
  { id: "calculator", href: "/dashboard/calculator", labelKey: "nav.calculator", icon: Calculator, group: "system", order: 56 },
  { id: "settings", href: "/dashboard/settings", labelKey: "nav.settingsFull", descriptionKey: "nav.descSettings", icon: Settings, group: "system", order: 57 },
  { id: "about", href: "/dashboard/about", labelKey: "nav.aboutUs", descriptionKey: "nav.descAboutUs", icon: Info, group: "system", order: 58 },
] as const;

export function getNavigationItems() {
  return NAVIGATION_REGISTRY.filter((item) => isNavigationVisible(item.href));
}

export function isNavigationActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}
