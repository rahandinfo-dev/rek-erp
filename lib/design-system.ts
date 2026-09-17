/**
 * REK Design System — single source of truth for brand tokens used in JS/TS.
 * CSS variables in `app/globals.css` mirror these values.
 */
export const DS = {
  color: {
    primary: "#13204F",
    primaryHover: "#0D183D",
    primarySoft: "#E8E3CE",
    primaryMuted: "rgba(19, 32, 79, 0.12)",
    background: "#E8E3CE",
    foreground: "#13204F",
    muted: "#DDD7C1",
    mutedForeground: "#53607D",
    border: "#B8B69F",
    borderStrong: "#92937F",
    card: "#F6F1DE",
    success: "#2F6B3A",
    successSoft: "#EAF5EC",
    warning: "#A15C12",
    warningSoft: "#F8E7BF",
    danger: "#B42318",
    dangerSoft: "#FCECEC",
    info: "#2563EB",
    infoSoft: "#EFF6FF",
    overlay: "rgba(19, 32, 79, 0.48)",
    chart: {
      /** Brand amber — sales / revenue */
      sales: "#13204F",
      /** Deep blue — purchases / expenses (clearly distinct from sales) */
      purchases: "#53607D",
      profit: "#2F6B3A",
      muted: "#6B645C",
    },
  },
  radius: {
    sm: "0px",
    md: "0px",
    lg: "0px",
    xl: "0px",
    "2xl": "0px",
    "3xl": "0px",
    full: "9999px",
  },
  shadow: {
    xs: "none",
    sm: "none",
    md: "none",
    lg: "none",
    brand: "none",
    brandHover: "none",
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
    fontFamily: '"NRT", Tahoma, sans-serif',
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
