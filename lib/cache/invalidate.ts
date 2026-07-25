import { revalidateTag } from "next/cache";

/** Invalidate company-scoped read caches after mutations. */
export function invalidateCompanyCaches(
  companyId: string,
  scopes: Array<"analytics" | "inventory" | "warehouses" | "all"> = ["all"]
) {
  const wantAll = scopes.includes("all");
  try {
    // Next.js 16: second arg is cacheLife profile ('max' = stale-while-revalidate)
    if (wantAll || scopes.includes("analytics")) {
      revalidateTag(`company-${companyId}-analytics`, "max");
    }
    if (wantAll || scopes.includes("inventory")) {
      revalidateTag(`company-${companyId}-inventory`, "max");
    }
    if (wantAll || scopes.includes("warehouses")) {
      revalidateTag(`company-${companyId}-warehouses`, "max");
    }
  } catch {
    // revalidateTag can throw outside request context — ignore
  }
}

export function invalidateAfterSale(companyId: string) {
  invalidateCompanyCaches(companyId, ["analytics", "inventory"]);
}

export function invalidateAfterPurchase(companyId: string) {
  invalidateCompanyCaches(companyId, ["analytics", "inventory"]);
}

export function invalidateAfterProduct(companyId: string) {
  invalidateCompanyCaches(companyId, ["analytics", "inventory"]);
}

export function invalidateAfterWarehouse(companyId: string) {
  invalidateCompanyCaches(companyId, ["warehouses", "inventory", "analytics"]);
}
