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
    title: "دوایین بینراوەکان",
    href: "/dashboard/recent",
    icon: History,
    description: "مێژووی چالاکی",
  },
  {
    title: "ناوەندی ڕەشنووس",
    href: "/dashboard/drafts",
    icon: History,
    description: "بەردەوامبوون لە ڕەشنووسە تەواونەبووەکان",
  },
  {
    title: "سەبەتەی زبڵ",
    href: "/dashboard/recycle-bin",
    icon: History,
    description: "گەڕاندنەوەی تۆمارە سڕاوەکان",
  },
  {
    title: "کردارە کۆمەڵایەتییەکان",
    href: "/dashboard/bulk",
    icon: History,
    description: "کارە کۆمەڵەکان و پێشکەوتن",
  },
  {
    title: "ناوەندی گەڕاندنەوە",
    href: "/dashboard/recovery",
    icon: History,
    description: "گەڕاندنەوەی دانیشتن",
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
    title: "تێمڵاینی چالاکی",
    href: "/dashboard/activity",
    icon: History,
    description: "مێژووی چالاکییەکانی سیستەم",
  },
  {
    title: "تۆماری چاودێری",
    href: "/dashboard/audit-log",
    icon: Shield,
    description: "چاودێری",
  },
  {
    title: "مێژووی وەشان",
    href: "/dashboard/version-history",
    icon: History,
    description: "بەراورد · گەڕاندنەوەی وەشان",
  },
  {
    title: "یاریدەدەری زیرەک",
    href: "/dashboard/ai-assistant",
    icon: Sparkles,
    description: "تێڕوانین · ئاگاداری · خۆکارکردن",
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
