import {
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

export type SidebarLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Extra keywords for sidebar search */
  keywords?: string[];
};

export type SidebarGroup = {
  id: string;
  label: string;
  items: SidebarLink[];
};

/** Odoo-style grouped sidebar — daily work first */
export const SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    id: "home",
    label: "سەرەکی",
    items: [
      {
        href: "/dashboard",
        label: "داشبۆرد",
        icon: LayoutDashboard,
        keywords: ["سەرەتا", "home"],
      },
    ],
  },
  {
    id: "inventory",
    label: "کۆگا و کاڵا",
    items: [
      {
        href: "/dashboard/inventory",
        label: "ئینڤێنتۆری",
        icon: Warehouse,
        keywords: ["کۆگا", "stock"],
      },
      {
        href: "/dashboard/products",
        label: "بەرهەمەکان",
        icon: Package,
        keywords: ["کاڵا", "product"],
      },
      {
        href: "/dashboard/werehouse",
        label: "کۆگاکان",
        icon: Boxes,
        keywords: ["warehouse"],
      },
      {
        href: "/dashboard/units",
        label: "یەکە",
        icon: Ruler,
        keywords: ["unit"],
      },
      {
        href: "/dashboard/barcode",
        label: "بارکۆد",
        icon: Barcode,
        keywords: ["سکان"],
      },
    ],
  },
  {
    id: "sales",
    label: "فرۆشتن و کڕین",
    items: [
      {
        href: "/dashboard/sales",
        label: "فرۆشتن",
        icon: ShoppingCart,
        keywords: ["sale"],
      },
      {
        href: "/dashboard/purchases",
        label: "کڕین",
        icon: ShoppingBasket,
        keywords: ["purchase"],
      },
      {
        href: "/dashboard/invoices",
        label: "پسوولەکان",
        icon: FileText,
        keywords: ["invoice"],
      },
      {
        href: "/dashboard/customers",
        label: "کڕیاران",
        icon: Users,
        keywords: ["customer"],
      },
      {
        href: "/dashboard/suppliers",
        label: "دابینکەران",
        icon: Truck,
        keywords: ["supplier"],
      },
    ],
  },
  {
    id: "people",
    label: "خەڵک",
    items: [
      {
        href: "/dashboard/employees",
        label: "کارمەندان",
        icon: IdCard,
        keywords: ["hr", "employee"],
      },
    ],
  },
  {
    id: "insights",
    label: "ڕاپۆرت",
    items: [
      {
        href: "/dashboard/analytics",
        label: "شیکاری",
        icon: ChartColumnIncreasing,
        keywords: ["analytics"],
      },
      {
        href: "/dashboard/reports",
        label: "ڕاپۆرتەکان",
        icon: ChartColumnIncreasing,
        keywords: ["report"],
      },
      {
        href: "/dashboard/activity",
        label: "Activity Timeline",
        icon: History,
        keywords: ["activity", "timeline", "audit", "history", "چاودێری"],
      },
      {
        href: "/dashboard/audit-log",
        label: "چاودێری",
        icon: Shield,
        keywords: ["audit"],
      },
      {
        href: "/dashboard/version-history",
        label: "Version History",
        icon: History,
        keywords: [
          "version",
          "history",
          "compare",
          "restore",
          "وەشان",
          "مێژوو",
        ],
      },
      {
        href: "/dashboard/ai-assistant",
        label: "AI Assistant",
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
    label: "سیستەم",
    items: [
      {
        href: "/dashboard/notifications",
        label: "ئاگاداری",
        icon: Bell,
        keywords: ["notification"],
      },
      {
        href: "/dashboard/recent",
        label: "Recently Viewed",
        icon: History,
        keywords: ["recent", "history", "viewed", "دوایین", "مێژوو"],
      },
      {
        href: "/dashboard/drafts",
        label: "Draft Center",
        icon: History,
        keywords: ["draft", "drafts", "recovery", "resume", "گەڕاندنەوە"],
      },
      {
        href: "/dashboard/recycle-bin",
        label: "Recycle Bin",
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
        label: "Bulk Operations",
        icon: History,
        keywords: ["bulk", "multi", "batch", "select", "کۆمەڵ", "هەڵبژاردن"],
      },
      {
        href: "/dashboard/settings/numbering",
        label: "Auto Numbering",
        icon: Settings,
        keywords: [
          "numbering",
          "sequence",
          "invoice number",
          "sku",
          "ژمارە",
          "سیری",
        ],
      },
      {
        href: "/dashboard/recovery",
        label: "Recovery Center",
        icon: History,
        keywords: ["recovery", "session", "گەڕاندنەوە"],
      },
      {
        href: "/dashboard/calculator",
        label: "ژمێرەر",
        icon: Calculator,
        keywords: ["calculator", "calc", "ژمێرەر"],
      },
      {
        href: "/dashboard/settings",
        label: "ڕێکخستن",
        icon: Settings,
        keywords: ["settings"],
      },
    ],
  },
];

export function filterSidebarGroups(query: string): SidebarGroup[] {
  const q = query.trim().toLowerCase();
  if (!q) return SIDEBAR_GROUPS;

  return SIDEBAR_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      const hay = [
        item.label,
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
