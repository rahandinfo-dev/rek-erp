import {
  BookOpen,
  Banknote,
  LayoutDashboard,
  Warehouse,
  Package,
  ShoppingCart,
  ShoppingBasket,
  Users,
  Truck,
  FileText,
  Bell,
  Printer,
  Settings,
  Boxes,
  Barcode,
  ChartColumnIncreasing,
  IdCard,
  Ruler,
  Shield,
  History,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export type AppMenuItem = {
  /** i18n message key for title */
  titleKey: string;
  href: string;
  icon: LucideIcon;
  /** i18n message key for description */
  descriptionKey?: string;
};

/** Grid launcher apps — order matches product IA. Titles are message keys. */
export const APP_GRID: AppMenuItem[] = [
  {
    titleKey: "nav.dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    descriptionKey: "nav.descHome",
  },
  {
    titleKey: "nav.currency",
    href: "/dashboard/currency",
    icon: Banknote,
    descriptionKey: "nav.descCurrency",
  },
  {
    titleKey: "nav.inventory",
    href: "/dashboard/inventory",
    icon: Warehouse,
    descriptionKey: "nav.descInventory",
  },
  {
    titleKey: "nav.inventoryAdjustments",
    href: "/dashboard/inventory/adjustments",
    icon: Boxes,
    descriptionKey: "nav.descAdjustments",
  },
  {
    titleKey: "nav.inventoryTransfers",
    href: "/dashboard/inventory/transfers",
    icon: Boxes,
    descriptionKey: "nav.descTransfers",
  },
  {
    titleKey: "nav.products",
    href: "/dashboard/products",
    icon: Package,
    descriptionKey: "nav.descProducts",
  },
  {
    titleKey: "nav.units",
    href: "/dashboard/units",
    icon: Ruler,
    descriptionKey: "nav.descUnits",
  },
  {
    titleKey: "nav.sales",
    href: "/dashboard/sales",
    icon: ShoppingCart,
    descriptionKey: "nav.descSales",
  },
  {
    titleKey: "nav.invoices",
    href: "/dashboard/invoices",
    icon: FileText,
    descriptionKey: "nav.descInvoices",
  },
  {
    titleKey: "nav.purchases",
    href: "/dashboard/purchases",
    icon: ShoppingBasket,
    descriptionKey: "nav.descPurchases",
  },
  {
    titleKey: "nav.customers",
    href: "/dashboard/customers",
    icon: Users,
    descriptionKey: "nav.descCustomers",
  },
  {
    titleKey: "nav.employees",
    href: "/dashboard/employees",
    icon: IdCard,
    descriptionKey: "nav.descEmployees",
  },
  {
    titleKey: "nav.employeeReports",
    href: "/dashboard/employees/reports",
    icon: ChartColumnIncreasing,
    descriptionKey: "nav.descEmployeeReports",
  },
  {
    titleKey: "nav.suppliers",
    href: "/dashboard/suppliers",
    icon: Truck,
    descriptionKey: "nav.descSuppliers",
  },
  {
    titleKey: "nav.reports",
    href: "/dashboard/reports",
    icon: ChartColumnIncreasing,
    descriptionKey: "nav.descReports",
  },
  {
    titleKey: "nav.notifications",
    href: "/dashboard/notifications",
    icon: Bell,
    descriptionKey: "nav.descNotifications",
  },
  {
    titleKey: "nav.recent",
    href: "/dashboard/recent",
    icon: History,
    descriptionKey: "nav.descRecent",
  },
  {
    titleKey: "nav.drafts",
    href: "/dashboard/drafts",
    icon: History,
    descriptionKey: "nav.descDrafts",
  },
  {
    titleKey: "nav.recycleBin",
    href: "/dashboard/recycle-bin",
    icon: History,
    descriptionKey: "nav.descRecycleBin",
  },
  {
    titleKey: "nav.bulk",
    href: "/dashboard/bulk",
    icon: History,
    descriptionKey: "nav.descBulk",
  },
  {
    titleKey: "nav.recovery",
    href: "/dashboard/recovery",
    icon: History,
    descriptionKey: "nav.descRecovery",
  },
  {
    titleKey: "nav.printCenter",
    href: "/dashboard/print-center",
    icon: Printer,
    descriptionKey: "nav.descPrint",
  },
  {
    titleKey: "nav.systemDocs",
    href: "/dashboard/settings/docs",
    icon: BookOpen,
    descriptionKey: "nav.descSystemDocs",
  },
  {
    titleKey: "nav.settingsFull",
    href: "/dashboard/settings",
    icon: Settings,
    descriptionKey: "nav.descSettings",
  },
  {
    titleKey: "nav.warehouse",
    href: "/dashboard/werehouse",
    icon: Boxes,
    descriptionKey: "nav.descWarehouse",
  },
  {
    titleKey: "nav.activity",
    href: "/dashboard/activity",
    icon: History,
    descriptionKey: "nav.descActivity",
  },
  {
    titleKey: "nav.auditLogFull",
    href: "/dashboard/audit-log",
    icon: Shield,
    descriptionKey: "nav.descAudit",
  },
  {
    titleKey: "nav.versionHistory",
    href: "/dashboard/version-history",
    icon: History,
    descriptionKey: "nav.descVersions",
  },
  {
    titleKey: "nav.aiAssistant",
    href: "/dashboard/ai-assistant",
    icon: Sparkles,
    descriptionKey: "nav.descAi",
  },
  {
    titleKey: "nav.barcode",
    href: "/dashboard/barcode",
    icon: Barcode,
    descriptionKey: "nav.descBarcode",
  },
  {
    titleKey: "nav.analytics",
    href: "/dashboard/analytics",
    icon: ChartColumnIncreasing,
    descriptionKey: "nav.descAnalytics",
  },
];
