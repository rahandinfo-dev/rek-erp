/** Destinations intentionally unavailable from every navigation surface. */
export const HIDDEN_NAVIGATION_HREFS = new Set([
  "/dashboard/releases",
  "/dashboard/version-history",
  "/dashboard/settings/numbering",
]);

export function isNavigationVisible(href: string) {
  return !HIDDEN_NAVIGATION_HREFS.has(href);
}
