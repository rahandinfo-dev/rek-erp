import { getNavigationItems } from "@/lib/navigation/registry";

// { href: "/dashboard/about" } is supplied by the canonical registry.

/** Legacy launcher adapter. New UI consumes NAVIGATION_REGISTRY directly. */
export const APP_GRID = getNavigationItems().map((item) => ({
  titleKey: item.labelKey,
  href: item.href,
  icon: item.icon,
  descriptionKey: item.descriptionKey,
}));

export type AppMenuItem = (typeof APP_GRID)[number];
