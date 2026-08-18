export const NAVIGATION_STYLES = ["GRID", "SIDE_MENU", "TAB_BAR", "FAB", "SHEET", "THREE_DOTS", "RECTANGULAR", "RUDDER"] as const;
export type NavigationStyle = (typeof NAVIGATION_STYLES)[number];
export const DEFAULT_NAVIGATION_STYLE: NavigationStyle = "SIDE_MENU";
export function isNavigationStyle(value: string | null | undefined): value is NavigationStyle { return Boolean(value && NAVIGATION_STYLES.includes(value as NavigationStyle)); }
