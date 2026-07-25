import { unstable_cache } from "next/cache";
import {
  buildAnalytics,
  buildDashboardChartData,
} from "@/lib/analytics/buildAnalytics";
import { buildInventorySummary } from "@/lib/inventory/query";
import { buildInventoryValuation } from "@/lib/inventory/valuation";
import { db } from "@/lib/prisma/db";

const REVALIDATE_SECONDS = 45;
const ANALYTICS_REVALIDATE_SECONDS = 60;
const WAREHOUSE_REVALIDATE_SECONDS = 120;

/** Short-lived company-scoped read cache for dashboard/analytics hot paths. */
export function getCachedDashboardChartData(companyId: string) {
  return unstable_cache(
    () => buildDashboardChartData(companyId),
    ["dashboard-charts", companyId],
    { revalidate: REVALIDATE_SECONDS, tags: [`company-${companyId}-analytics`] }
  )();
}

export function getCachedAnalytics(companyId: string) {
  return unstable_cache(
    () => buildAnalytics(companyId),
    ["analytics-full", companyId],
    {
      revalidate: ANALYTICS_REVALIDATE_SECONDS,
      tags: [`company-${companyId}-analytics`],
    }
  )();
}

export function getCachedInventorySummary(companyId: string) {
  return unstable_cache(
    () => buildInventorySummary(companyId),
    ["inventory-summary", companyId],
    { revalidate: REVALIDATE_SECONDS, tags: [`company-${companyId}-inventory`] }
  )();
}

export function getCachedInventoryValuation(companyId: string) {
  return unstable_cache(
    () => buildInventoryValuation(companyId),
    ["inventory-valuation", companyId],
    { revalidate: REVALIDATE_SECONDS, tags: [`company-${companyId}-inventory`] }
  )();
}

/** Main warehouse for product cards / list labels — rarely changes. */
export function getCachedMainWarehouse(companyId: string) {
  return unstable_cache(
    () =>
      db.warehouse.findFirst({
        where: { companyId },
        orderBy: [{ isMain: "desc" }, { createdAt: "asc" }],
        select: { id: true, name: true },
      }),
    ["main-warehouse", companyId],
    {
      revalidate: WAREHOUSE_REVALIDATE_SECONDS,
      tags: [`company-${companyId}-warehouses`],
    }
  )();
}
