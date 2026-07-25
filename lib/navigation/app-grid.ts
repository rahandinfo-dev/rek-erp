import {
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
  title: string;
  href: string;
  icon: LucideIcon;
  description?: string;
};

/** Grid launcher apps — order matches product IA */
export const APP_GRID: AppMenuItem[] = [
  {
    title: "داشبۆرد",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "سەرەکی",
  },
  {
    title: "ئینڤێنتۆری",
    href: "/dashboard/inventory",
    icon: Warehouse,
    description: "کۆگا",
  },
  {
    title: "ڕێکخستنی کۆگا",
    href: "/dashboard/inventory/adjustments",
    icon: Boxes,
    description: "ڕێکخستن",
  },
  {
    title: "گواستنەوە",
    href: "/dashboard/inventory/transfers",
    icon: Boxes,
    description: "گواستنەوە",
  },
  {
    title: "بەرهەمەکان",
    href: "/dashboard/products",
    icon: Package,
    description: "کاڵا",
  },
  {
    title: "یەکە",
    href: "/dashboard/units",
    icon: Ruler,
    description: "یەکە",
  },
  {
    title: "فرۆشتن",
    href: "/dashboard/sales",
    icon: ShoppingCart,
    description: "فرۆشتن",
  },
  {
    title: "پسوولەکان",
    href: "/dashboard/invoices",
    icon: FileText,
    description: "پسوولە",
  },
  {
    title: "کڕین",
    href: "/dashboard/purchases",
    icon: ShoppingBasket,
    description: "کڕین",
  },
  {
    title: "کڕیاران",
    href: "/dashboard/customers",
    icon: Users,
    description: "کڕیار",
  },
  {
    title: "کارمەندان",
    href: "/dashboard/employees",
    icon: IdCard,
    description: "کارمەند",
  },
  {
    title: "ڕاپۆرتی کارمەند",
    href: "/dashboard/employees/reports",
    icon: ChartColumnIncreasing,
    description: "ڕاپۆرتی HR",
  },
  {
    title: "دابینکەران",
    href: "/dashboard/suppliers",
    icon: Truck,
    description: "دابینکەر",
  },
  {
    title: "ڕاپۆرتەکان",
    href: "/dashboard/reports",
    icon: ChartColumnIncreasing,
    description: "شیکاری",
  },
  {
    title: "ئاگادارکردنەوە",
    href: "/dashboard/notifications",
    icon: Bell,
    description: "نۆتیف",
  },
  {
    title: "Recently Viewed",
    href: "/dashboard/recent",
    icon: History,
    description: "Activity history",
  },
  {
    title: "Draft Center",
    href: "/dashboard/drafts",
    icon: History,
    description: "Resume unfinished drafts",
  },
  {
    title: "Recycle Bin",
    href: "/dashboard/recycle-bin",
    icon: History,
    description: "Restore soft-deleted records",
  },
  {
    title: "Bulk Operations",
    href: "/dashboard/bulk",
    icon: History,
    description: "Multi-record jobs & progress",
  },
  {
    title: "Recovery Center",
    href: "/dashboard/recovery",
    icon: History,
    description: "Session recovery",
  },

  {
    title: "سەنتەری چاپ",
    href: "/dashboard/print-center",
    icon: Printer,
    description: "چاپ",
  },
  {
    title: "ڕێکخستنەکان",
    href: "/dashboard/settings",
    icon: Settings,
    description: "ڕێکخستن",
  },
  {
    title: "کۆگا",
    href: "/dashboard/werehouse",
    icon: Boxes,
    description: "کۆگا",
  },
  {
    title: "Activity Timeline",
    href: "/dashboard/activity",
    icon: History,
    description: "Enterprise activity history",
  },
  {
    title: "تۆماری چاودێری",
    href: "/dashboard/audit-log",
    icon: Shield,
    description: "چاودێری",
  },
  {
    title: "Version History",
    href: "/dashboard/version-history",
    icon: History,
    description: "Compare · Restore versions",
  },
  {
    title: "AI Assistant",
    href: "/dashboard/ai-assistant",
    icon: Sparkles,
    description: "Insights · Alerts · Automation",
  },
  {
    title: "بارکۆد",
    href: "/dashboard/barcode",
    icon: Barcode,
    description: "بارکۆد",
  },
  {
    title: "شیکاری",
    href: "/dashboard/analytics",
    icon: ChartColumnIncreasing,
    description: "شیکاری",
  },
];
