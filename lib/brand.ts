import { DS } from "@/lib/design-system";

export const BRAND = {
  nameEn: "REK",
  nameKu: "ڕێک",
  shortName: "REK",
  productName: "REK ERP",
  taglineKu: "سیستەمی بەڕێوەبردنی کارگە",
  taglineEn: "Enterprise Resource Planning",
  logo: "/logo.png",
  colors: {
    primary: DS.color.primary,
    primaryHover: DS.color.primaryHover,
    primaryMuted: DS.color.primaryMuted,
    secondary: DS.color.background,
    secondaryDark: DS.color.primarySoft,
    onPrimary: "#ffffff",
    onSecondary: DS.color.foreground,
    text: DS.color.foreground,
    muted: DS.color.mutedForeground,
    border: DS.color.border,
    danger: DS.color.danger,
    sales: DS.color.chart.sales,
    purchases: DS.color.chart.purchases,
  },
} as const;

export type BrandColors = typeof BRAND.colors;
