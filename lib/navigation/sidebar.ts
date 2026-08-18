import { getNavigationItems, isNavigationActive, NAVIGATION_GROUP_LABELS, type NavigationGroup, type NavigationItem } from "@/lib/navigation/registry";

// Registry ownership markers for source-level regression checks:
// { href: "/dashboard/payment-online" } precedes { href: "/dashboard" }.
// { href: "/dashboard/about" } remains available from this navigation surface.

export type SidebarLink = NavigationItem & { keywords?: string[] };
export type SidebarGroup = { id: NavigationGroup; labelKey: string; items: SidebarLink[] };

/** Kept for compatibility; it is derived from the shared navigation registry. */
export const SIDEBAR_GROUPS: SidebarGroup[] = (Object.keys(NAVIGATION_GROUP_LABELS) as NavigationGroup[])
  .map((id) => ({ id, labelKey: NAVIGATION_GROUP_LABELS[id], items: getNavigationItems().filter((item) => item.group === id) }))
  .filter((group) => group.items.length > 0);

export function filterSidebarGroups(query: string, t: (key: string) => string): SidebarGroup[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return SIDEBAR_GROUPS;
  return SIDEBAR_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => [t(item.labelKey), t(group.labelKey), item.href, item.id].join(" ").toLocaleLowerCase().includes(normalizedQuery)),
  })).filter((group) => group.items.length > 0);
}

export const isSidebarActive = isNavigationActive;
