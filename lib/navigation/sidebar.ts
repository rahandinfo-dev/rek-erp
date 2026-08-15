import {
  Banknote,
  Barcode,
  Boxes,
  Calculator,
  ChartColumnIncreasing,
  FileText,
  IdCard,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingBasket,
  ShoppingCart,
  Truck,
  Users,
  Warehouse,
  Bell,
  Shield,
  Ruler,
  History,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { isNavigationVisible } from "@/lib/navigation/visibility";

export type SidebarLink = {
  href: string;
  /** i18n message key, e.g. `nav.products` */
  labelKey: string;
  icon: LucideIcon;
  /** Extra keywords for sidebar search (locale-agnostic + KU/EN aliases) */
  keywords?: string[];
};

export type SidebarGroup = {
  id: string;
  /** i18n message key, e.g. `nav.inventoryGroup` */
  labelKey: string;
  items: SidebarLink[];
};

/** Odoo-style grouped sidebar — daily work first. Labels are message keys. */
export const SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    id: "home",
    labelKey: "nav.home",
    items: [
      {
        href: "/dashboard",
        labelKey: "nav.dashboard",
        icon: LayoutDashboard,
        keywords: ["سەرەتا", "home"],
      },
      {
        href: "/dashboard/currency",
        labelKey: "nav.currency",
        icon: Banknote,
        keywords: ["دراو", "دینار", "دۆلار", "currency", "IQD", "USD"],
      },
    ],
  },
  {
    id: "inventory",
    labelKey: "nav.inventoryGroup",
    items: [
      {
        href: "/dashboard/inventory",
        labelKey: "nav.inventory",
        icon: Warehouse,
        keywords: ["کۆگا", "stock"],
      },
      {
        href: "/dashboard/products",
        labelKey: "nav.products",
        icon: Package,
        keywords: ["کاڵا", "product"],
      },
      {
        href: "/dashboard/werehouse",
        labelKey: "nav.warehouses",
        icon: Boxes,
        keywords: ["warehouse"],
      },
      {
        href: "/dashboard/units",
        labelKey: "nav.units",
        icon: Ruler,
        keywords: ["unit"],
      },
      {
        href: "/dashboard/barcode",
        labelKey: "nav.barcode",
        icon: Barcode,
        keywords: ["سکان"],
      },
    ],
  },
  {
    id: "sales",
    labelKey: "nav.tradingGroup",
    items: [
      {
        href: "/dashboard/sales",
        labelKey: "nav.sales",
        icon: ShoppingCart,
        keywords: ["sale"],
      },
      {
        href: "/dashboard/purchases",
        labelKey: "nav.purchases",
        icon: ShoppingBasket,
        keywords: ["purchase"],
      },
      {
        href: "/dashboard/invoices",
        labelKey: "nav.invoices",
        icon: FileText,
        keywords: ["invoice"],
      },
      {
        href: "/dashboard/customers",
        labelKey: "nav.customers",
        icon: Users,
        keywords: ["customer"],
      },
      {
        href: "/dashboard/suppliers",
        labelKey: "nav.suppliers",
        icon: Truck,
        keywords: ["supplier"],
      },
    ],
  },
  {
    id: "people",
    labelKey: "nav.peopleGroup",
    items: [
      {
        href: "/dashboard/employees",
        labelKey: "nav.employees",
        icon: IdCard,
        keywords: ["hr", "employee"],
      },
    ],
  },
  {
    id: "insights",
    labelKey: "nav.insightsGroup",
    items: [
      {
        href: "/dashboard/analytics",
        labelKey: "nav.analytics",
        icon: ChartColumnIncreasing,
        keywords: ["analytics"],
      },
      {
        href: "/dashboard/reports",
        labelKey: "nav.reports",
        icon: ChartColumnIncreasing,
        keywords: ["report"],
      },
      {
        href: "/dashboard/activity",
        labelKey: "nav.activity",
        icon: History,
        keywords: ["activity", "timeline", "audit", "history", "چاودێری"],
      },
      {
        href: "/dashboard/audit-log",
        labelKey: "nav.auditLog",
        icon: Shield,
        keywords: ["audit"],
      },
      {
        href: "/dashboard/ai-assistant",
        labelKey: "nav.aiAssistant",
        icon: Sparkles,
        keywords: [
          "ai",
          "assistant",
          "smart",
          "automation",
          "insights",
          "یاریدەدەر",
          "ژیری",
        ],
      },
    ],
  },
  {
    id: "system",
    labelKey: "nav.systemGroup",
    items: [
      {
        href: "/dashboard/notifications",
        labelKey: "nav.notifications",
        icon: Bell,
        keywords: ["notification"],
      },
      {
        href: "/dashboard/recent",
        labelKey: "nav.recent",
        icon: History,
        keywords: ["recent", "history", "viewed", "دوایین", "مێژوو"],
      },
      {
        href: "/dashboard/drafts",
        labelKey: "nav.drafts",
        icon: History,
        keywords: ["draft", "drafts", "recovery", "resume", "گەڕاندنەوە"],
      },
      {
        href: "/dashboard/recycle-bin",
        labelKey: "nav.recycleBin",
        icon: History,
        keywords: [
          "recycle",
          "trash",
          "deleted",
          "restore",
          "bin",
          "سڕاوە",
          "گەڕاندنەوە",
        ],
      },
      {
        href: "/dashboard/bulk",
        labelKey: "nav.bulk",
        icon: History,
        keywords: ["bulk", "multi", "batch", "select", "کۆمەڵ", "هەڵبژاردن"],
      },
      {
        href: "/dashboard/recovery",
        labelKey: "nav.recovery",
        icon: History,
        keywords: ["recovery", "session", "گەڕاندنەوە"],
      },
      {
        href: "/dashboard/calculator",
        labelKey: "nav.calculator",
        icon: Calculator,
        keywords: ["calculator", "calc", "ژمێرەر"],
      },
      {
        href: "/dashboard/settings",
        labelKey: "nav.settings",
        icon: Settings,
        keywords: ["settings", "ڕێکخستن"],
      },
    ],
  },
];

export function filterSidebarGroups(
  query: string,
  t: (key: string) => string
): SidebarGroup[] {
  const q = query.trim().toLowerCase();

  return SIDEBAR_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (!isNavigationVisible(item.href)) return false;
      if (!q) return true;
      const hay = [
        t(item.labelKey),
        t(group.labelKey),
        ...(item.keywords || []),
        item.href,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    }),
  })).filter((g) => g.items.length > 0);
}

export function isSidebarActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}
