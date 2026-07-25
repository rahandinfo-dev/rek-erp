import { db } from "@/lib/prisma/db";
import { getCachedAnalytics } from "@/lib/cache/company-reads";
import { formatMoney } from "@/lib/utils/format";
import type { AiInsightView, BusinessHealth } from "@/lib/ai/types";
import { aiCacheGet, aiCacheKey, aiCacheSet } from "@/lib/ai/cache";

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
      label: "Inventory health",
      score: input.inventoryHealthScore,
      note: `${input.lowStockCount} low · ${input.outOfStockCount} out`,
    },
    {
      key: "profit",
      label: "Monthly profitability",
      score:
        input.profitThisMonth > 0
          ? Math.min(100, 60 + Math.log10(input.profitThisMonth + 1) * 8)
          : input.profitThisMonth === 0
            ? 50
            : 25,
      note:
        input.profitThisMonth >= 0
          ? `Profit ${formatMoney(input.profitThisMonth)} IQD`
          : "Negative profit",
    },
    {
      key: "sales",
      label: "Sales momentum",
      score:
        input.revenueThisMonth > 0
          ? Math.min(100, 55 + Math.log10(input.revenueThisMonth + 1) * 7)
          : 35,
      note: `Revenue ${formatMoney(input.revenueThisMonth)} IQD`,
    },
    {
      key: "credit",
      label: "Collections risk",
      score: input.creditCount === 0 ? 90 : Math.max(20, 85 - input.creditCount * 3),
      note: `${input.creditCount} credit sales`,
    },
  ];
  const score = Math.round(
    factors.reduce((s, f) => s + f.score, 0) / factors.length
  );
  const label =
    score >= 85
      ? "Excellent"
      : score >= 70
        ? "Good"
        : score >= 55
          ? "Fair"
          : score >= 40
            ? "At Risk"
            : "Critical";
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
      title: `Business health: ${health.label}`,
      summary: `Overall score ${health.score}/100 across inventory, profit, sales and credit.`,
      severity: health.score >= 70 ? "info" : health.score >= 55 ? "warning" : "critical",
      href: "/dashboard/ai-assistant",
      score: health.score,
    },
    {
      category: "sales",
      title: "Sales snapshot",
      summary: `Today ${formatMoney(analytics.summary.revenueToday)} · Month ${formatMoney(analytics.summary.revenueThisMonth)} IQD · ${analytics.summary.salesCountThisMonth} orders.`,
      severity: "info",
      href: "/dashboard/analytics",
      score: analytics.summary.salesCountThisMonth,
    },
    {
      category: "purchases",
      title: "Purchase spend",
      summary: `This month ${formatMoney(analytics.summary.expensesThisMonth)} IQD across ${analytics.summary.purchasesCountThisMonth} purchases.`,
      severity: "info",
      href: "/dashboard/purchases",
    },
    {
      category: "inventory",
      title: "Inventory status",
      summary: `Health ${analytics.summary.inventoryHealthScore}% · Value ${formatMoney(analytics.summary.inventoryValue)} IQD · Low ${analytics.summary.lowStockCount}.`,
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
      title: "Profit & loss",
      summary: `Month profit ${formatMoney(analytics.summary.profitThisMonth)} IQD (gross ${formatMoney(analytics.summary.grossProfitThisMonth)}).`,
      severity: analytics.summary.profitThisMonth < 0 ? "critical" : "info",
      href: "/dashboard/reports",
      score: analytics.summary.profitThisMonth,
    },
    {
      category: "customers",
      title: "Top customer",
      summary: analytics.bestCustomers[0]
        ? `${analytics.bestCustomers[0].name} leads with ${analytics.bestCustomers[0].orders} orders.`
        : "No customer sales yet.",
      severity: "info",
      href: "/dashboard/customers",
    },
    {
      category: "suppliers",
      title: "Top supplier",
      summary: analytics.topSuppliers[0]
        ? `${analytics.topSuppliers[0].name} · ${analytics.topSuppliers[0].orders} purchases.`
        : "No supplier activity yet.",
      severity: "info",
      href: "/dashboard/suppliers",
    },
    {
      category: "warehouses",
      title: "Warehouse health",
      summary: analytics.warehouseStats[0]
        ? `${analytics.warehouseStats.length} warehouses · Main status ${analytics.warehouseStats.find((w) => w.isMain)?.status || analytics.warehouseStats[0].status}.`
        : "No warehouses configured.",
      severity: "info",
      href: "/dashboard/werehouse",
    },
  ];

  const employees = await db.employee.count({ where: { companyId } });
  drafts.push({
    category: "employees",
    title: "Workforce",
    summary: `${employees} employees on record.`,
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
