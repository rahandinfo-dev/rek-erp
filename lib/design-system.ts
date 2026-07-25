/**
 * REK Design System — single source of truth for brand tokens used in JS/TS.
 * CSS variables in `app/globals.css` mirror these values.
 */
export const DS = {
  color: {
    primary: "#FFAE42",
    primaryHover: "#E8942A",
    primarySoft: "#FFF4E5",
    primaryMuted: "rgba(255, 174, 66, 0.12)",
    background: "#FFFFFF",
    foreground: "#171412",
    muted: "#F7F5F2",
    mutedForeground: "#6B645C",
    border: "#E8E2DA",
    borderStrong: "#D6CEC3",
    card: "#FFFFFF",
    success: "#2F6B3A",
    successSoft: "#EAF5EC",
    warning: "#A15C12",
    warningSoft: "#FFF4E5",
    danger: "#B42318",
    dangerSoft: "#FCECEC",
    info: "#2563EB",
    infoSoft: "#EFF6FF",
    overlay: "rgba(23, 20, 18, 0.4)",
    chart: {
      /** Brand amber — sales / revenue */
      sales: "#FFAE42",
      /** Deep blue — purchases / expenses (clearly distinct from sales) */
      purchases: "#1D4E89",
      profit: "#2F6B3A",
      muted: "#6B645C",
    },
  },
  radius: {
    sm: "0.5rem",
    md: "0.75rem",
    lg: "1rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
    "3xl": "1.75rem",
    full: "9999px",
  },
  shadow: {
    xs: "0 1px 2px rgba(23, 20, 18, 0.04)",
    sm: "0 4px 12px rgba(23, 20, 18, 0.06)",
    md: "0 8px 24px rgba(23, 20, 18, 0.08)",
    lg: "0 16px 40px rgba(23, 20, 18, 0.1)",
    brand: "0 8px 24px rgba(255, 174, 66, 0.18)",
    brandHover: "0 16px 36px rgba(255, 174, 66, 0.22)",
  },
  space: {
    1: "0.25rem",
    2: "0.5rem",
    3: "0.75rem",
    4: "1rem",
    5: "1.25rem",
    6: "1.5rem",
    8: "2rem",
    10: "2.5rem",
    12: "3rem",
  },
  typography: {
    fontFamily: '"RUDAW Regular", Tahoma, sans-serif',
    pageTitle:
      "text-[1.75rem] font-black tracking-tight text-foreground sm:text-3xl lg:text-[2rem]",
    sectionTitle: "text-lg font-black text-foreground sm:text-xl",
    label: "text-sm font-bold text-foreground",
    muted: "text-sm text-muted-foreground",
    caption: "text-xs text-muted-foreground",
  },
  focus:
    "outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/35",
} as const;

export type DesignSystem = typeof DS;
