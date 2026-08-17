export const PROTECTED_SUBSCRIPTION_PATHS = [
  "/dashboard/sales",
  "/dashboard/purchases",
  "/dashboard/werehouse",
  "/dashboard/customers",
  "/dashboard/suppliers",
  "/dashboard/employees",
] as const;

export const PROTECTED_SUBSCRIPTION_API_PREFIXES = [
  "/api/sales",
  "/api/purchases",
  "/api/werehouses",
  "/api/customers",
  "/api/suppliers",
  "/api/employees",
] as const;

export function isSubscriptionProtectedHref(href: string) {
  return PROTECTED_SUBSCRIPTION_PATHS.some(
    (path) => href === path || href.startsWith(`${path}/`)
  );
}
