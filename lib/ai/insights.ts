import { db } from "@/lib/prisma/db";
import { getCachedAnalytics } from "@/lib/cache/company-reads";
import { formatMoneyLocalized } from "@/lib/i18n";
import { tServer } from "@/lib/i18n";
import type { AiInsightView, BusinessHealth } from "@/lib/ai/types";
import { aiCacheGet, aiCacheKey, aiCacheSet } from "@/lib/ai/cache";

const t = tServer.t.bind(tServer);

function mapInsight(row: {
  id: string;
  category: string;
  title: string;
  summary: string;
  severity: string;
  href: string | null;
  score: number | null;
  createdAt: Date;
}): AiInsightView {
  return {
    id: row.id,
    category: row.category,
    title: row.title,
    summary: row.summary,
    severity: row.severity,
    href: row.href,
    score: row.score,
    createdAt: row.createdAt.toISOString(),
  };
}

export function computeBusinessHealth(input: {
  inventoryHealthScore: number;
  profitThisMonth: number;
  revenueThisMonth: number;
  lowStockCount: number;
  outOfStockCount: number;
  creditCount: number;
}): BusinessHealth {
  const factors = [
    {
      key: "inventory",
      label: t("ai.health.inventory"),
      score: input.inventoryHealthScore,
      note: t("ai.health.inventoryNote", {
        low: input.lowStockCount,
        out: input.outOfStockCount,
      }),
    },
    {
      key: "profit",
      label: t("ai.health.profit"),
      score:
        input.profitThisMonth > 0
          ? Math.min(100, 60 + Math.log10(input.profitThisMonth + 1) * 8)
          : input.profitThisMonth === 0
            ? 50
            : 25,
      note:
        input.profitThisMonth >= 0
          ? t("ai.health.profitNote", {
              amount: formatMoneyLocalized(input.profitThisMonth),
            })
          : t("ai.health.negativeProfit"),
    },
    {
      key: "sales",
      label: t("ai.health.sales"),
      score:
        input.revenueThisMonth > 0
          ? Math.min(100, 55 + Math.log10(input.revenueThisMonth + 1) * 7)
          : 35,
      note: t("ai.health.salesNote", {
        amount: formatMoneyLocalized(input.revenueThisMonth),
      }),
    },
    {
      key: "credit",
      label: t("ai.health.credit"),
      score: input.creditCount === 0 ? 90 : Math.max(20, 85 - input.creditCount * 3),
      note: t("ai.health.creditNote", { count: input.creditCount }),
    },
  ];
  const score = Math.round(
    factors.reduce((s, f) => s + f.score, 0) / factors.length
  );
  const label =
    score >= 85
      ? t("ai.health.excellent")
      : score >= 70
        ? t("ai.health.good")
        : score >= 55
          ? t("ai.health.fair")
          : score >= 40
            ? t("ai.health.atRisk")
            : t("ai.health.critical");
  return { score, label, factors };
}

/** Refresh cached insight rows for the company. */
export async function refreshAiInsights(companyId: string): Promise<AiInsightView[]> {
  const cacheKey = aiCacheKey(companyId, "insights");
  const cached = aiCacheGet<AiInsightView[]>(cacheKey, 60_000);
  if (cached) return cached;

  const analytics = await getCachedAnalytics(companyId);
  const creditCount = await db.sale.count({
    where: { companyId, status: "COMPLETED", paymentMethod: "CREDIT" },
  });
  const health = computeBusinessHealth({
    inventoryHealthScore: analytics.summary.inventoryHealthScore,
    profitThisMonth: analytics.summary.profitThisMonth,
    revenueThisMonth: analytics.summary.revenueThisMonth,
    lowStockCount: analytics.summary.lowStockCount,
    outOfStockCount: analytics.summary.outOfStockCount,
    creditCount,
  });

  const drafts: Array<{
    category: string;
    title: string;
    summary: string;
    severity: string;
    href?: string;
    score?: number;
  }> = [
    {
      category: "health",
      title: t("ai.insights.healthTitle", { label: health.label }),
      summary: t("ai.insights.healthSummary", { score: health.score }),
      severity: health.score >= 70 ? "info" : health.score >= 55 ? "warning" : "critical",
      href: "/dashboard/ai-assistant",
      score: health.score,
    },
    {
      category: "sales",
      title: t("ai.insights.salesTitle"),
      summary: t("ai.insights.salesSummary", {
        today: formatMoneyLocalized(analytics.summary.revenueToday),
        month: formatMoneyLocalized(analytics.summary.revenueThisMonth),
        orders: analytics.summary.salesCountThisMonth,
      }),
      severity: "info",
      href: "/dashboard/analytics",
      score: analytics.summary.salesCountThisMonth,
    },
    {
      category: "purchases",
      title: t("ai.insights.purchasesTitle"),
      summary: t("ai.insights.purchasesSummary", {
        amount: formatMoneyLocalized(analytics.summary.expensesThisMonth),
        count: analytics.summary.purchasesCountThisMonth,
      }),
      severity: "info",
      href: "/dashboard/purchases",
    },
    {
      category: "inventory",
      title: t("ai.insights.inventoryTitle"),
      summary: t("ai.insights.inventorySummary", {
        health: analytics.summary.inventoryHealthScore,
        value: formatMoneyLocalized(analytics.summary.inventoryValue),
        low: analytics.summary.lowStockCount,
      }),
      severity:
        analytics.summary.outOfStockCount > 0
          ? "warning"
          : analytics.summary.lowStockCount > 0
            ? "warning"
            : "info",
      href: "/dashboard/inventory",
      score: analytics.summary.inventoryHealthScore,
    },
    {
      category: "profit",
      title: t("ai.insights.profitTitle"),
      summary: t("ai.insights.profitSummary", {
        profit: formatMoneyLocalized(analytics.summary.profitThisMonth),
        gross: formatMoneyLocalized(analytics.summary.grossProfitThisMonth),
      }),
      severity: analytics.summary.profitThisMonth < 0 ? "critical" : "info",
      href: "/dashboard/reports",
      score: analytics.summary.profitThisMonth,
    },
    {
      category: "customers",
      title: t("ai.insights.topCustomerTitle"),
      summary: analytics.bestCustomers[0]
        ? t("ai.insights.topCustomerSummary", {
            name: analytics.bestCustomers[0].name,
            orders: analytics.bestCustomers[0].orders,
          })
        : t("ai.insights.noCustomerSales"),
      severity: "info",
      href: "/dashboard/customers",
    },
    {
      category: "suppliers",
      title: t("ai.insights.topSupplierTitle"),
      summary: analytics.topSuppliers[0]
        ? t("ai.insights.topSupplierSummary", {
            name: analytics.topSuppliers[0].name,
            orders: analytics.topSuppliers[0].orders,
          })
        : t("ai.insights.noSupplierActivity"),
      severity: "info",
      href: "/dashboard/suppliers",
    },
    {
      category: "warehouses",
      title: t("ai.insights.warehouseTitle"),
      summary: analytics.warehouseStats[0]
        ? t("ai.insights.warehouseSummary", {
            count: analytics.warehouseStats.length,
            status:
              analytics.warehouseStats.find((w) => w.isMain)?.status ||
              analytics.warehouseStats[0].status,
          })
        : t("ai.insights.noWarehouses"),
      severity: "info",
      href: "/dashboard/werehouse",
    },
  ];

  const employees = await db.employee.count({ where: { companyId } });
  drafts.push({
    category: "employees",
    title: t("ai.insights.workforceTitle"),
    summary: t("ai.insights.workforceSummary", { count: employees }),
    severity: "info",
    href: "/dashboard/employees",
    score: employees,
  });

  // Replace recent insights (keep last generation fresh)
  await db.aiInsight.deleteMany({
    where: {
      companyId,
      createdAt: { lt: new Date(Date.now() - 6 * 3600_000) },
    },
  });

  const created = await Promise.all(
    drafts.map((d) =>
      db.aiInsight.create({
        data: {
          companyId,
          category: d.category,
          title: d.title,
          summary: d.summary,
          severity: d.severity,
          href: d.href || null,
          score: d.score ?? null,
          expiresAt: new Date(Date.now() + 2 * 3600_000),
        },
      })
    )
  );

  const result = created.map(mapInsight);
  aiCacheSet(cacheKey, result);
  return result;
}

export async function listInsights(companyId: string): Promise<AiInsightView[]> {
  const rows = await db.aiInsight.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    take: 24,
  });
  if (!rows.length) return refreshAiInsights(companyId);
  return rows.map(mapInsight);
}

export async function getBusinessHealth(companyId: string): Promise<BusinessHealth> {
  const analytics = await getCachedAnalytics(companyId);
  const creditCount = await db.sale.count({
    where: { companyId, status: "COMPLETED", paymentMethod: "CREDIT" },
  });
  return computeBusinessHealth({
    inventoryHealthScore: analytics.summary.inventoryHealthScore,
    profitThisMonth: analytics.summary.profitThisMonth,
    revenueThisMonth: analytics.summary.revenueThisMonth,
    lowStockCount: analytics.summary.lowStockCount,
    outOfStockCount: analytics.summary.outOfStockCount,
    creditCount,
  });
}
