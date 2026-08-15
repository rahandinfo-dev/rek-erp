import { fuzzyScore } from "@/lib/search/fuzzy";
import type { SearchHit } from "@/lib/search/types";
import { isNavigationVisible } from "@/lib/navigation/visibility";

export type SearchCatalogItem = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  type: string;
  group: "modules" | "reports" | "tools" | "settings";
  keywords: string[];
};

/** Static enterprise destinations — modules, reports, barcode/SKU tools. */
export const SEARCH_CATALOG: SearchCatalogItem[] = [
  {
    id: "dashboard",
    title: "داشبۆرد",
    subtitle: "سەرەکی سیستەم",
    href: "/dashboard",
    type: "dashboard",
    group: "modules",
    keywords: ["dashboard", "داشبۆرد", "سەرەکی", "home"],
  },
  {
    id: "products",
    title: "بەرهەمەکان",
    subtitle: "لیستی کاڵا و SKU",
    href: "/dashboard/products",
    type: "product",
    group: "modules",
    keywords: ["products", "بەرهەم", "کاڵا", "sku", "product"],
  },
  {
    id: "customers",
    title: "کڕیاران",
    subtitle: "بەڕێوەبردنی کڕیار",
    href: "/dashboard/customers",
    type: "customer",
    group: "modules",
    keywords: ["customers", "کڕیار", "customer", "client"],
  },
  {
    id: "suppliers",
    title: "دابینکەران",
    subtitle: "فرۆشیار و دابینکەر",
    href: "/dashboard/suppliers",
    type: "supplier",
    group: "modules",
    keywords: ["suppliers", "دابینکەر", "supplier", "vendor"],
  },
  {
    id: "invoices",
    title: "پسوولەکان",
    subtitle: "پسوولە",
    href: "/dashboard/invoices",
    type: "invoice",
    group: "modules",
    keywords: ["invoices", "پسوولە", "invoice", "فاتورە"],
  },
  {
    id: "sales",
    title: "فرۆشتن",
    subtitle: "پسوولەی فرۆشتن",
    href: "/dashboard/sales",
    type: "sale",
    group: "modules",
    keywords: ["sales", "فرۆشتن", "sale", "pos"],
  },
  {
    id: "purchases",
    title: "کڕین",
    subtitle: "پسوولەی کڕین",
    href: "/dashboard/purchases",
    type: "purchase",
    group: "modules",
    keywords: ["purchases", "کڕین", "purchase", "buy"],
  },
  {
    id: "warehouses",
    title: "کۆگاکان",
    subtitle: "کۆگا",
    href: "/dashboard/werehouse",
    type: "warehouse",
    group: "modules",
    keywords: ["warehouse", "warehouses", "کۆگا", "werehouse", "stock location"],
  },
  {
    id: "units",
    title: "یەکەکان",
    subtitle: "Unit of measure",
    href: "/dashboard/units",
    type: "unit",
    group: "modules",
    keywords: ["unit", "units", "یەکە", "uom", "measure"],
  },
  {
    id: "employees",
    title: "کارمەندان",
    subtitle: "HR",
    href: "/dashboard/employees",
    type: "employee",
    group: "modules",
    keywords: ["employees", "کارمەند", "employee", "hr", "staff"],
  },
  {
    id: "inventory",
    title: "ئینڤێنتۆری",
    subtitle: "کۆگا و جوڵە",
    href: "/dashboard/inventory",
    type: "inventory",
    group: "modules",
    keywords: ["inventory", "ئینڤێنتۆری", "stock", "کۆگا"],
  },
  {
    id: "activity-timeline",
    title: "تێمڵاینی چالاکی",
    subtitle: "مێژووی چالاکییەکانی سیستەم",
    href: "/dashboard/activity",
    type: "reports",
    group: "reports",
    keywords: [
      "activity",
      "timeline",
      "audit",
      "log",
      "چاودێری",
      "history",
      "ip",
      "device",
    ],
  },
  {
    id: "audit-log",
    title: "تۆماری چاودێری",
    subtitle: "Audit Log · Who / When / What",
    href: "/dashboard/audit-log",
    type: "reports",
    group: "reports",
    keywords: ["audit", "log", "چاودێری", "تۆمار", "ip", "device"],
  },
  {
    id: "ai-assistant",
    title: "یاریدەدەری زیرەک",
    subtitle: "Ask · Insights · Alerts · Automation",
    href: "/dashboard/ai-assistant",
    type: "reports",
    group: "reports",
    keywords: [
      "ai",
      "assistant",
      "smart",
      "automation",
      "insights",
      "recommendations",
      "alerts",
      "یاریدەدەر",
      "ژیری",
    ],
  },
  {
    id: "barcode",
    title: "بارکۆد",
    subtitle: "سکان · چاپ · Code128",
    href: "/dashboard/barcode",
    type: "barcode",
    group: "tools",
    keywords: ["barcode", "بارکۆد", "code128", "scan", "سکان", "scanner"],
  },
  {
    id: "sku-tool",
    title: "گەڕان بە SKU",
    subtitle: "بەرهەمەکان · SKU",
    href: "/dashboard/products",
    type: "sku",
    group: "tools",
    keywords: ["sku", "ئێس کەی یو", "کۆدی بەرهەم", "product code"],
  },
  {
    id: "reports",
    title: "ڕاپۆرتەکان",
    subtitle: "فرۆشتن · کڕین · کۆگا",
    href: "/dashboard/reports",
    type: "reports",
    group: "reports",
    keywords: ["reports", "ڕاپۆرت", "report", "شیکاری"],
  },
  {
    id: "analytics",
    title: "شیکاری",
    subtitle: "شیکاری",
    href: "/dashboard/analytics",
    type: "reports",
    group: "reports",
    keywords: ["analytics", "شیکاری", "chart", "kpi"],
  },
  {
    id: "employee-reports",
    title: "ڕاپۆرتی کارمەند",
    subtitle: "HR Reports",
    href: "/dashboard/employees/reports",
    type: "reports",
    group: "reports",
    keywords: ["employee report", "ڕاپۆرتی کارمەند", "hr report", "payroll"],
  },
  {
    id: "inventory-history",
    title: "مێژووی جوڵەی کۆگا",
    subtitle: "Movement history",
    href: "/dashboard/inventory/history",
    type: "inventory",
    group: "reports",
    keywords: ["history", "مێژوو", "movement", "جوڵە"],
  },
  {
    id: "adjustments",
    title: "ڕێکخستنی کۆگا",
    subtitle: "Stock adjustment",
    href: "/dashboard/inventory/adjustments",
    type: "inventory",
    group: "tools",
    keywords: ["adjustment", "ڕێکخستن", "increase", "decrease"],
  },
  {
    id: "transfers",
    title: "گواستنەوەی کۆگا",
    subtitle: "Transfer",
    href: "/dashboard/inventory/transfers",
    type: "inventory",
    group: "tools",
    keywords: ["transfer", "گواستنەوە", "move stock"],
  },
  {
    id: "notifications",
    title: "ناوەندی ئاگاداری",
    subtitle: "نۆتیفیکەیشن",
    href: "/dashboard/notifications",
    type: "notification",
    group: "modules",
    keywords: ["notification", "ئاگاداری", "نۆتیف", "alert"],
  },
  {
    id: "settings",
    title: "ڕێکخستنەکان",
    subtitle: "ڕێکخستنەکان",
    href: "/dashboard/settings",
    type: "settings",
    group: "settings",
    keywords: ["settings", "ڕێکخستن", "سێتینگ", "company"],
  },
  {
    id: "calculator",
    title: "ژمێرەر",
    subtitle: "ژمێرەر",
    href: "/dashboard/calculator",
    type: "module",
    group: "tools",
    keywords: ["calculator", "ژمێرەر", "calc", "math"],
  },
  {
    id: "print-center",
    title: "سەنتەری چاپ",
    subtitle: "Print center",
    href: "/dashboard/print-center",
    type: "module",
    group: "tools",
    keywords: ["print", "چاپ", "printer"],
  },
  {
    id: "draft-center",
    title: "ناوەندی ڕەشنووس",
    subtitle: "ناوەندی ڕەشنووس",
    href: "/dashboard/drafts",
    type: "module",
    group: "tools",
    keywords: ["draft", "drafts", "ڕەشنووس", "recovery", "restore", "resume"],
  },
  {
    id: "recycle-bin",
    title: "سەبەتەی زبڵ",
    subtitle: "گەڕاندنەوەی تۆمارە سڕاوەکان",
    href: "/dashboard/recycle-bin",
    type: "module",
    group: "tools",
    keywords: [
      "recycle",
      "bin",
      "trash",
      "deleted",
      "restore",
      "purge",
      "سڕاوە",
      "گەڕاندنەوە",
    ],
  },
  {
    id: "bulk-operations",
    title: "کردارە کۆمەڵایەتییەکان",
    subtitle: "Multi-record jobs",
    href: "/dashboard/bulk",
    type: "module",
    group: "tools",
    keywords: ["bulk", "batch", "multi", "select", "کۆمەڵ"],
  },
  {
    id: "favorites",
    title: "دڵخوازەکان",
    subtitle: "دڵخوازەکان",
    href: "/dashboard",
    type: "module",
    group: "modules",
    keywords: ["favorites", "دڵخواز", "star", "pinned", "bookmark"],
  },
  {
    id: "recent-history",
    title: "مێژووی دوایین",
    subtitle: "دوایین بینراوەکان",
    href: "/dashboard/recent",
    type: "module",
    group: "modules",
    keywords: ["recent", "history", "مێژوو", "دوایین", "viewed"],
  },
];

export const SEARCH_QUICK_START: SearchHit[] = [
  {
    id: "qs-products",
    title: "بەرهەمەکان",
    subtitle: "بەرهەمەکان · SKU · بارکۆد",
    href: "/dashboard/products",
    type: "product",
    module: "بەرهەمەکان",
  },
  {
    id: "qs-customers",
    title: "کڕیاران",
    subtitle: "کڕیارەکان",
    href: "/dashboard/customers",
    type: "customer",
    module: "کڕیارەکان",
  },
  {
    id: "qs-suppliers",
    title: "دابینکەران",
    subtitle: "دابینکەران",
    href: "/dashboard/suppliers",
    type: "supplier",
    module: "دابینکەران",
  },
  {
    id: "qs-invoices",
    title: "پسوولەکان",
    subtitle: "پسوولەکان",
    href: "/dashboard/invoices",
    type: "invoice",
    module: "پسوولەکان",
  },
  {
    id: "qs-warehouses",
    title: "کۆگاکان",
    subtitle: "کۆگاکان",
    href: "/dashboard/werehouse",
    type: "warehouse",
    module: "کۆگاکان",
  },
  {
    id: "qs-employees",
    title: "کارمەندان",
    subtitle: "کارمەندان",
    href: "/dashboard/employees",
    type: "employee",
    module: "کارمەندان",
  },
  {
    id: "qs-reports",
    title: "ڕاپۆرتەکان",
    subtitle: "ڕاپۆرتەکان",
    href: "/dashboard/reports",
    type: "reports",
    module: "ڕاپۆرتەکان",
  },
  {
    id: "qs-barcode",
    title: "بارکۆد",
    subtitle: "Barcode scanner & print",
    href: "/dashboard/barcode",
    type: "barcode",
    module: "بارکۆد",
  },
  {
    id: "qs-units",
    title: "یەکەکان",
    subtitle: "یەکەکان",
    href: "/dashboard/units",
    type: "unit",
    module: "بەرهەمەکان",
  },
];

export function matchCatalog(
  query: string,
  scope?: "settings" | "reports"
): SearchHit[] {
  const q = query.trim();
  if (!q) return [];

  return SEARCH_CATALOG.filter((item) => isNavigationVisible(item.href)).map((item) => {
    const score = Math.max(
      fuzzyScore(q, item.title),
      fuzzyScore(q, item.subtitle),
      fuzzyScore(q, item.href),
      ...item.keywords.map((k) => fuzzyScore(q, k))
    );
    return { item, score };
  })
    .filter((x) => {
      if (x.score <= 0) return false;
      if (scope === "settings") return x.item.group === "settings";
      if (scope === "reports")
        return x.item.group === "reports" || x.item.type === "reports";
      return true;
    })
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => ({
      id: item.id,
      title: item.title,
      subtitle: item.subtitle,
      href: item.href,
      type: item.type,
      module:
        item.group === "reports"
          ? "ڕاپۆرتەکان"
          : item.group === "settings"
            ? "ڕێکخستنەکان"
            : item.group === "tools"
              ? "Tools"
              : "Pages",
    }));
}
