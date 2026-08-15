import { db } from "@/lib/prisma/db";
import { getCachedAnalytics } from "@/lib/cache/company-reads";
import { buildReports } from "@/lib/reports/buildReports";
import { runEnterpriseSearch } from "@/lib/search/enterpriseSearch";
import type { ParsedIntent } from "@/lib/ai/parse";
import {
  AI_SUGGESTED_PROMPTS,
  type AiChatResponse,
} from "@/lib/ai/types";
import { buildRecommendations } from "@/lib/ai/recommendations";
import { listOpenAlerts } from "@/lib/ai/alerts";
import { formatQuantityWithUnit } from "@/lib/utils/format";
import {
  getCustomerDebt,
  getExpensesTotal,
  getLeastSellingProduct,
  getLowStockProducts,
  getNetProfit,
  getProfitMonthOverMonth,
  getSalesTotal,
  getStockUnits,
  getSupplierDebtStatus,
  getTodayInvoiceCount,
  getTopSellingProduct,
  getUserCount,
  getWeeklyTransactions,
  moneyKu,
  numKu,
  type MetricPeriod,
} from "@/lib/ai/metrics";

function none(msg: string): string {
  return msg;
}

function periodOf(parsed: ParsedIntent, fallback: MetricPeriod = "month") {
  return parsed.period || fallback;
}

/** Execute against company-scoped real data only — never invent numbers. */
export async function executeAiIntent(
  companyId: string,
  parsed: ParsedIntent
): Promise<AiChatResponse> {
  switch (parsed.intent) {
    case "month_net_profit": {
      const period = periodOf(parsed, "month");
      const m = await getNetProfit(companyId, period);
      if (m.empty) {
        return {
          intent: "month_net_profit",
          period,
          reply: none(
            `هیچ فرۆشتن یان کڕینێکی تەواوکراو بۆ ${m.range.labelKu} تۆمار نەکراوە. قازانجی ساف حیساب ناکرێت چونکە داتا نییە.`
          ),
          suggestions: AI_SUGGESTED_PROMPTS.slice(0, 4),
          links: [{ label: "ڕاپۆرتەکان", href: "/dashboard/reports" }],
          data: m as unknown as Record<string, unknown>,
        };
      }
      return {
        intent: "month_net_profit",
        period,
        reply: `قازانجی سافی ${m.range.labelKu} (فرۆشتن − کڕین):\n• فرۆشتن: ${moneyKu(m.sales)} (${numKu(m.salesCount)} مامەڵە)\n• کڕین / خەرجی: ${moneyKu(m.expenses)} (${numKu(m.purchasesCount)} مامەڵە)\n• قازانجی ساف: ${moneyKu(m.net)}\n\nئەم ژمارانە تەنها لە تۆمارە تەواوکراوەکانی داتابەیسەوە هاتوون.`,
        links: [
          { label: "ڕاپۆرتەکان", href: "/dashboard/reports" },
          { label: "شیکاری", href: "/dashboard/analytics" },
        ],
        data: m as unknown as Record<string, unknown>,
        suggestions: [
          "ئەم مانگە قازانج زیاد بووە یان کەم بووە؟",
          "کۆی فرۆشتنی ئەم مانگە چەندە؟",
        ],
      };
    }

    case "month_sales_total": {
      const period = periodOf(parsed, "month");
      const m = await getSalesTotal(companyId, period);
      if (m.empty) {
        return {
          intent: "month_sales_total",
          period,
          reply: `هیچ فرۆشتنێکی تەواوکراو بۆ ${m.range.labelKu} تۆمار نەکراوە.`,
          links: [{ label: "فرۆشتن", href: "/dashboard/sales" }],
          data: m as unknown as Record<string, unknown>,
        };
      }
      return {
        intent: "month_sales_total",
        period,
        reply: `کۆی فرۆشتنی ${m.range.labelKu}:\n• بڕ: ${moneyKu(m.total)}\n• ژمارەی فرۆشتن: ${numKu(m.count)}`,
        links: [
          { label: "فرۆشتن", href: "/dashboard/sales" },
          { label: "شیکاری", href: "/dashboard/analytics" },
        ],
        data: m as unknown as Record<string, unknown>,
        suggestions: ["قازانجی سافی ئەم مانگە چەندە؟", "کام کاڵا زۆرترین فرۆشتراوە؟"],
      };
    }

    case "month_expenses_total": {
      const period = periodOf(parsed, "month");
      const m = await getExpensesTotal(companyId, period);
      if (m.empty) {
        return {
          intent: "month_expenses_total",
          period,
          reply: `هیچ کڕینێکی تەواوکراو بۆ ${m.range.labelKu} تۆمار نەکراوە. لە سیستەمدا خەرجی = کڕینی تەواوکراو.`,
          links: [{ label: "کڕین", href: "/dashboard/purchases" }],
          data: m as unknown as Record<string, unknown>,
        };
      }
      return {
        intent: "month_expenses_total",
        period,
        reply: `کۆی خەرجییەکانی ${m.range.labelKu} (کڕینی تەواوکراو):\n• بڕ: ${moneyKu(m.total)}\n• ژمارەی کڕین: ${numKu(m.count)}`,
        links: [
          { label: "کڕین", href: "/dashboard/purchases" },
          { label: "ڕاپۆرتەکان", href: "/dashboard/reports" },
        ],
        data: m as unknown as Record<string, unknown>,
        suggestions: ["قازانجی سافی ئەم مانگە چەندە؟"],
      };
    }

    case "customer_debt": {
      const m = await getCustomerDebt(companyId);
      if (m.empty) {
        return {
          intent: "customer_debt",
          reply: `هیچ فرۆشتنێکی قەرز (CREDIT) تۆمار نەکراوە. بەپێی داتا، قەرزی کڕیاران سفرە.\n\n${m.definitionKu}`,
          links: [{ label: "فرۆشتن", href: "/dashboard/sales" }],
          data: m as unknown as Record<string, unknown>,
        };
      }
      const lines = m.samples
        .map(
          (s) =>
            `• ${s.invoiceNo} — ${s.customer} — ${moneyKu(s.total)}`
        )
        .join("\n");
      return {
        intent: "customer_debt",
        reply: `قەرزی کڕیاران:\n• کۆی قەرز: ${moneyKu(m.total)}\n• ژمارەی فرۆشتنی قەرز: ${numKu(m.count)}\n\n${m.definitionKu}\n\nدوایین تۆمارەکان:\n${lines}`,
        links: [
          { label: "فرۆشتن", href: "/dashboard/sales" },
          { label: "کڕیارەکان", href: "/dashboard/customers" },
        ],
        data: m as unknown as Record<string, unknown>,
      };
    }

    case "supplier_debt": {
      const m = await getSupplierDebtStatus();
      return {
        intent: "supplier_debt",
        reply: m.messageKu,
        links: [
          { label: "کڕین", href: "/dashboard/purchases" },
          { label: "دابینکەران", href: "/dashboard/suppliers" },
        ],
        data: { supported: false },
        suggestions: ["کۆی خەرجییەکانی ئەم مانگا چەندە؟"],
      };
    }

    case "top_selling_product": {
      const period = periodOf(parsed, "month");
      const m = await getTopSellingProduct(companyId, period);
      if (m.empty) {
        return {
          intent: "top_selling_product",
          period,
          reply: `هیچ فرۆشتنێک بۆ ${m.range.labelKu} تۆمار نەکراوە؛ ناتوانرێت باشترین کاڵا دیاری بکرێت.`,
          links: [{ label: "فرۆشتن", href: "/dashboard/sales" }],
        };
      }
      const lines = m.items
        .map(
          (p, i) =>
            `${i + 1}. ${p.name} (${p.sku}) — بڕ ${numKu(p.quantity)} · ${moneyKu(p.revenue)}`
        )
        .join("\n");
      return {
        intent: "top_selling_product",
        period,
        reply: `زۆرترین فرۆشراو بۆ ${m.range.labelKu}:\n• ${m.top.name} (${m.top.sku})\n• بڕ: ${numKu(m.top.quantity)} · داهات: ${moneyKu(m.top.revenue)}\n\nلیستی سەرەکی:\n${lines}`,
        links: [
          { label: "بەرهەمەکان", href: "/dashboard/products" },
          { label: "شیکاری", href: "/dashboard/analytics" },
        ],
        data: m as unknown as Record<string, unknown>,
        suggestions: ["کام کاڵا کەمترین فرۆشتراوە؟"],
      };
    }

    case "least_selling_product": {
      const period = periodOf(parsed, "month");
      const m = await getLeastSellingProduct(companyId, period);
      if (m.empty) {
        return {
          intent: "least_selling_product",
          period,
          reply: `هیچ فرۆشتنێک بۆ ${m.range.labelKu} تۆمار نەکراوە؛ ناتوانرێت کەمترین فرۆشراو دیاری بکرێت.`,
          links: [{ label: "فرۆشتن", href: "/dashboard/sales" }],
        };
      }
      return {
        intent: "least_selling_product",
        period,
        reply: `کەمترین فرۆشراو لە نێو کاڵا فرۆشراوەکانی ${m.range.labelKu}:\n• ${m.least.name} (${m.least.sku})\n• بڕ: ${numKu(m.least.quantity)} · داهات: ${moneyKu(m.least.revenue)}\n\nتێبینی: تەنها کاڵاکانی کە لەم ماوەیەدا لانیکەم جارێک فرۆشراون لە حیسابدا دانراون.`,
        links: [{ label: "بەرهەمەکان", href: "/dashboard/products" }],
        data: m as unknown as Record<string, unknown>,
      };
    }

    case "low_stock": {
      const m = await getLowStockProducts(companyId);
      if (m.empty) {
        return {
          intent: "low_stock",
          reply:
            "هیچ کاڵایەک نزیک لە تەواوبوون یان بەتاڵ نەدۆزرایەوە (بەپێی کۆگا و کەمترین بڕی تۆمارکراو).",
          links: [{ label: "ئینڤێنتۆری", href: "/dashboard/inventory" }],
          data: m as unknown as Record<string, unknown>,
        };
      }
      const lines = m.items
        .map(
          (p) =>
            `• ${p.name} (${p.sku}) — ${formatQuantityWithUnit(p.currentStock, p.unit)}/${formatQuantityWithUnit(p.minimumStock, p.unit)}`
        )
        .join("\n");
      return {
        intent: "low_stock",
        reply: `کاڵاکانی نزیک لە تەواوبوون / بەتاڵ:\n• کەم: ${numKu(m.lowCount)} · بەتاڵ: ${numKu(m.outCount)}\n\n${lines}`,
        links: [
          { label: "ئینڤێنتۆری", href: "/dashboard/inventory" },
          { label: "بەرهەمەکان", href: "/dashboard/products" },
        ],
        data: m as unknown as Record<string, unknown>,
      };
    }

    case "stock_units": {
      const m = await getStockUnits(companyId);
      if (m.empty) {
        return {
          intent: "stock_units",
          reply: "هیچ بەرهەمێکی چالاک لە کۆگا تۆمار نەکراوە.",
          links: [{ label: "بەرهەمەکان", href: "/dashboard/products" }],
        };
      }
      return {
        intent: "stock_units",
        reply: `کۆگای ئێستا:\n• ژمارەی بەرهەمی چالاک: ${numKu(m.productCount)}\n• کۆی یەکەکان لە کۆگا: ${numKu(m.units, 2)}`,
        links: [
          { label: "ئینڤێنتۆری", href: "/dashboard/inventory" },
          { label: "بەرهەمەکان", href: "/dashboard/products" },
        ],
        data: m as unknown as Record<string, unknown>,
      };
    }

    case "today_invoices": {
      const m = await getTodayInvoiceCount(companyId);
      return {
        intent: "today_invoices",
        period: "today",
        reply: m.empty
          ? "ئەمڕۆ هیچ پسوولەیەک تۆمار نەکراوە."
          : `ژمارەی پسوولەکانی ئەمڕۆ: ${numKu(m.count)}.`,
        links: [{ label: "پسوولەکان", href: "/dashboard/invoices" }],
        data: m as unknown as Record<string, unknown>,
        suggestions: ["فرۆشتنی ئەمڕۆ چەندە؟"],
      };
    }

    case "user_count": {
      const m = await getUserCount(companyId);
      return {
        intent: "user_count",
        reply: m.empty
          ? "هیچ بەکارهێنەرێک بۆ ئەم کۆمپانیایە تۆمار نەکراوە."
          : `ژمارەی بەکارهێنەرانی کۆمپانیا: ${numKu(m.count)}.`,
        links: [{ label: "ڕێکخستنەکان", href: "/dashboard/settings" }],
        data: m as unknown as Record<string, unknown>,
      };
    }

    case "week_transactions": {
      const m = await getWeeklyTransactions(companyId);
      if (m.empty) {
        return {
          intent: "week_transactions",
          period: "week",
          reply: `ئەم هەفتەیە هیچ مامەڵەیەکی فرۆشتن یان کڕین تۆمار نەکراوە.`,
          links: [{ label: "داشبۆرد", href: "/dashboard" }],
        };
      }
      return {
        intent: "week_transactions",
        period: "week",
        reply: `مامەڵەکانی ${m.range.labelKu}:\n• کۆی مامەڵە: ${numKu(m.totalCount)}\n• فرۆشتن: ${numKu(m.salesCount)} · ${moneyKu(m.salesTotal)}\n• کڕین: ${numKu(m.purchasesCount)} · ${moneyKu(m.purchasesTotal)}`,
        links: [
          { label: "فرۆشتن", href: "/dashboard/sales" },
          { label: "کڕین", href: "/dashboard/purchases" },
        ],
        data: m as unknown as Record<string, unknown>,
      };
    }

    case "profit_mom_change": {
      const m = await getProfitMonthOverMonth(companyId);
      if (m.empty) {
        return {
          intent: "profit_mom_change",
          reply:
            "داتای تەواوی فرۆشتن/کڕین بۆ ئەم مانگە و مانگی پێشوو نییە؛ ناتوانرێت بەراوردی قازانج بکرێت.",
          links: [{ label: "ڕاپۆرتەکان", href: "/dashboard/reports" }],
        };
      }
      const dirKu =
        m.direction === "up"
          ? "زیاد بووە"
          : m.direction === "down"
            ? "کەم بووە"
            : "گۆڕانکاری نەبووە";
      return {
        intent: "profit_mom_change",
        period: "month",
        reply: `بەراوردی قازانجی ساف:\n• ئەم مانگە: ${moneyKu(m.thisMonth.net)}\n• مانگی پێشوو: ${moneyKu(m.lastMonth.net)}\n• جیاوازی: ${moneyKu(m.delta)} (${m.pct >= 0 ? "+" : ""}${numKu(m.pct, 1)}%)\n• ئەنجام: قازانج ${dirKu}.`,
        links: [
          { label: "ڕاپۆرتەکان", href: "/dashboard/reports" },
          { label: "شیکاری", href: "/dashboard/analytics" },
        ],
        data: m as unknown as Record<string, unknown>,
      };
    }

    case "today_sales": {
      const period = periodOf(parsed, "today");
      const m = await getSalesTotal(companyId, period);
      if (m.empty) {
        return {
          intent: "today_sales",
          period,
          reply: "ئەمڕۆ هیچ فرۆشتنێکی تەواوکراو تۆمار نەکراوە.",
          links: [{ label: "فرۆشتن", href: "/dashboard/sales" }],
        };
      }
      const sales = await db.sale.findMany({
        where: {
          companyId,
          status: "COMPLETED",
          saleDate: { gte: m.range.start },
        },
        select: {
          invoiceNo: true,
          total: true,
          customer: { select: { name: true } },
        },
        orderBy: { saleDate: "desc" },
        take: 5,
      });
      const lines = sales
        .map(
          (s) =>
            `• ${s.invoiceNo} — ${s.customer.name} — ${moneyKu(Number(s.total))}`
        )
        .join("\n");
      return {
        intent: "today_sales",
        period,
        reply: `فرۆشتنەکانی ئەمڕۆ:\n• کۆی: ${moneyKu(m.total)}\n• ژمارە: ${numKu(m.count)}\n\n${lines}`,
        links: [{ label: "فرۆشتن", href: "/dashboard/sales" }],
        data: { count: m.count, total: m.total },
      };
    }

    case "create_invoice":
      return {
        intent: "create_invoice",
        reply:
          "بۆ دروستکردنی پسوولەی نوێ، فرۆشتنی نوێ بکەرەوە. کاتێک فرۆشتن تەواو دەبێت، پسوولە خۆکارانە دروست دەبێت.",
        links: [
          { label: "فرۆشتنی نوێ", href: "/dashboard/sales/new" },
          { label: "پسوولەکان", href: "/dashboard/invoices" },
        ],
      };

    case "search_customer": {
      const q = parsed.query || "";
      if (!q) {
        return {
          intent: "search_customer",
          reply: "ناوی کڕیارەکە بنووسە، بۆ نموونە: «گەڕان بۆ کڕیار ئەحمەد».",
          links: [{ label: "کڕیارەکان", href: "/dashboard/customers" }],
        };
      }
      const hits = await runEnterpriseSearch({
        companyId,
        query: q,
        filter: "customers",
      });
      const items = hits.groups.flatMap((g) => g.items).slice(0, 6);
      return {
        intent: "search_customer",
        reply: items.length
          ? `${numKu(hits.total)} کڕیار بۆ «${q}»:\n${items
              .map((h) => `• ${h.title}${h.subtitle ? ` — ${h.subtitle}` : ""}`)
              .join("\n")}`
          : `هیچ کڕیارێک بۆ «${q}» نەدۆزرایەوە.`,
        links: [
          { label: "کڕیارەکان", href: "/dashboard/customers" },
          ...items.slice(0, 3).map((h) => ({ label: h.title, href: h.href })),
        ],
        data: { total: hits.total },
      };
    }

    case "unpaid_invoices": {
      const m = await getCustomerDebt(companyId);
      if (m.empty) {
        return {
          intent: "unpaid_invoices",
          reply: "هیچ فرۆشتنی قەرز / پسوولەی نەدراو تۆمار نەکراوە.",
          links: [{ label: "فرۆشتن", href: "/dashboard/sales" }],
        };
      }
      const lines = m.samples
        .map((s) => `• ${s.invoiceNo} — ${s.customer} — ${moneyKu(s.total)}`)
        .join("\n");
      return {
        intent: "unpaid_invoices",
        reply: `فرۆشتنەکانی قەرز:\n• کۆی: ${moneyKu(m.total)} · ژمارە: ${numKu(m.count)}\n\n${lines}`,
        links: [
          { label: "فرۆشتن", href: "/dashboard/sales" },
          { label: "پسوولەکان", href: "/dashboard/invoices" },
        ],
        data: m as unknown as Record<string, unknown>,
      };
    }

    case "monthly_report": {
      const report = await buildReports(companyId, {
        preset: "month",
        granularity: "daily",
      });
      const empty =
        report.summary.salesCount === 0 && report.summary.purchasesCount === 0;
      return {
        intent: "monthly_report",
        period: "month",
        reply: empty
          ? "بۆ ئەم مانگە هیچ فرۆشتن یان کڕینێک تۆمار نەکراوە؛ ڕاپۆرت بەتاڵە."
          : `ڕاپۆرتی مانگانە (داتای تۆمارکراو):\n• داهات: ${moneyKu(report.summary.revenue)}\n• خەرجی: ${moneyKu(report.summary.expenses)}\n• قازانج: ${moneyKu(report.summary.profit)}\n• فرۆشتن: ${numKu(report.summary.salesCount)} · کڕین: ${numKu(report.summary.purchasesCount)}`,
        links: [
          { label: "ڕاپۆرتەکان", href: "/dashboard/reports" },
          { label: "شیکاری", href: "/dashboard/analytics" },
        ],
        data: report.summary as unknown as Record<string, unknown>,
      };
    }

    case "compare_months":
    case "profit_loss": {
      // Reuse MoM / net profit real metrics
      if (parsed.intent === "compare_months") {
        return executeAiIntent(companyId, {
          ...parsed,
          intent: "profit_mom_change",
        });
      }
      return executeAiIntent(companyId, {
        ...parsed,
        intent: "month_net_profit",
        period: periodOf(parsed, "month"),
      });
    }

    case "sales_analysis": {
      const analytics = await getCachedAnalytics(companyId);
      const s = analytics.summary;
      if (s.salesCountTotal === 0) {
        return {
          intent: "sales_analysis",
          reply: "هیچ فرۆشتنێک تۆمار نەکراوە بۆ شیکاری.",
          links: [{ label: "فرۆشتن", href: "/dashboard/sales" }],
        };
      }
      return {
        intent: "sales_analysis",
        reply: `شیکاری فرۆشتن (داتای کۆمپانیا):\n• ئەمڕۆ: ${moneyKu(s.revenueToday)}\n• ئەم مانگە: ${moneyKu(s.revenueThisMonth)} (${numKu(s.salesCountThisMonth)} فرۆشتن)\n• کۆی گشتی: ${moneyKu(s.revenueTotal)}\n• باشترین بەرهەم: ${analytics.topProducts[0]?.name || "داتا نییە"}\n• باشترین کڕیار: ${analytics.bestCustomers[0]?.name || "داتا نییە"}`,
        links: [
          { label: "فرۆشتن", href: "/dashboard/sales" },
          { label: "شیکاری", href: "/dashboard/analytics" },
        ],
      };
    }

    case "purchase_analysis": {
      const analytics = await getCachedAnalytics(companyId);
      const s = analytics.summary;
      if (s.purchasesCountTotal === 0 && s.expensesTotal === 0) {
        return {
          intent: "purchase_analysis",
          reply: "هیچ کڕینێک تۆمار نەکراوە بۆ شیکاری.",
          links: [{ label: "کڕین", href: "/dashboard/purchases" }],
        };
      }
      return {
        intent: "purchase_analysis",
        reply: `شیکاری کڕین:\n• ئەمڕۆ: ${moneyKu(s.expensesToday)}\n• ئەم مانگە: ${moneyKu(s.expensesThisMonth)} (${numKu(s.purchasesCountThisMonth)} کڕین)\n• کۆی گشتی: ${moneyKu(s.expensesTotal)}\n• باشترین دابینکەر: ${analytics.topSuppliers[0]?.name || "داتا نییە"}`,
        links: [
          { label: "کڕین", href: "/dashboard/purchases" },
          { label: "دابینکەران", href: "/dashboard/suppliers" },
        ],
      };
    }

    case "inventory_analysis": {
      const analytics = await getCachedAnalytics(companyId);
      const s = analytics.summary;
      if (s.productsCount === 0) {
        return {
          intent: "inventory_analysis",
          reply: "هیچ بەرهەمێک تۆمار نەکراوە.",
          links: [{ label: "بەرهەمەکان", href: "/dashboard/products" }],
        };
      }
      return {
        intent: "inventory_analysis",
        reply: `شیکاری کۆگا:\n• بەرهەم: ${numKu(s.productsCount)} · کۆگا: ${numKu(s.warehousesCount)}\n• بەها: ${moneyKu(s.inventoryValue)} · یەکە: ${numKu(s.inventoryUnits, 2)}\n• کەم: ${numKu(s.lowStockCount)} · بەتاڵ: ${numKu(s.outOfStockCount)}`,
        links: [
          { label: "ئینڤێنتۆری", href: "/dashboard/inventory" },
          { label: "کۆگاکان", href: "/dashboard/werehouse" },
        ],
      };
    }

    case "customer_insights": {
      const analytics = await getCachedAnalytics(companyId);
      const tops = analytics.bestCustomers.slice(0, 5);
      return {
        intent: "customer_insights",
        reply: tops.length
          ? `باشترین کڕیارەکان (${numKu(analytics.summary.customersCount)} کڕیار):\n${tops
              .map(
                (c, i) =>
                  `${i + 1}. ${c.name} — ${numKu(c.orders)} داواکاری · ${moneyKu(c.revenue)}`
              )
              .join("\n")}`
          : "هیچ فرۆشتنێکی کڕیار تۆمار نەکراوە.",
        links: [{ label: "کڕیارەکان", href: "/dashboard/customers" }],
      };
    }

    case "supplier_performance": {
      const analytics = await getCachedAnalytics(companyId);
      const tops = analytics.topSuppliers.slice(0, 5);
      return {
        intent: "supplier_performance",
        reply: tops.length
          ? `باشترین دابینکەران (${numKu(analytics.summary.suppliersCount)} دابینکەر):\n${tops
              .map(
                (s, i) =>
                  `${i + 1}. ${s.name} — ${numKu(s.orders)} داواکاری · ${moneyKu(s.spent)}`
              )
              .join("\n")}`
          : "هیچ کڕینێکی دابینکەر تۆمار نەکراوە.",
        links: [{ label: "دابینکەران", href: "/dashboard/suppliers" }],
      };
    }

    case "employee_stats": {
      const [total, active] = await Promise.all([
        db.employee.count({ where: { companyId } }),
        db.employee.count({ where: { companyId, status: "ACTIVE" } }),
      ]);
      return {
        intent: "employee_stats",
        reply:
          total === 0
            ? "هیچ کارمەندێک تۆمار نەکراوە."
            : `ئاماری کارمەندان:\n• کۆی: ${numKu(total)}\n• چالاک: ${numKu(active)}\n• هیتر: ${numKu(total - active)}`,
        links: [{ label: "کارمەندان", href: "/dashboard/employees" }],
      };
    }

    case "warehouse_performance": {
      const analytics = await getCachedAnalytics(companyId);
      const lines = analytics.warehouseStats
        .slice(0, 6)
        .map(
          (w) =>
            `• ${w.name}${w.isMain ? " (سەرەکی)" : ""} — ${w.status} · فرۆشتن ${moneyKu(w.sales)}`
        )
        .join("\n");
      return {
        intent: "warehouse_performance",
        reply: lines
          ? `ئەدای کۆگا:\n${lines}`
          : "هیچ کۆگایەک نەدۆزرایەوە.",
        links: [{ label: "کۆگاکان", href: "/dashboard/werehouse" }],
      };
    }

    case "recommendations": {
      const analytics = await getCachedAnalytics(companyId);
      const recs = await buildRecommendations(companyId, analytics);
      return {
        intent: "recommendations",
        reply: recs.length
          ? `پێشنیارەکان لەسەر داتای ڕاستەقینە:\n${recs
              .slice(0, 6)
              .map((r, i) => `${i + 1}. ${r.title} — ${r.reason}`)
              .join("\n")}`
          : "ئێستا پێشنیارێک لەسەر داتا دروست نابێت.",
        links: [{ label: "یاریدەدەری زیرەک", href: "/dashboard/ai-assistant" }],
        data: { recommendations: recs },
      };
    }

    case "alerts": {
      const alerts = await listOpenAlerts(companyId);
      return {
        intent: "alerts",
        reply: alerts.length
          ? `ئاگاداری چالاکەکان (${numKu(alerts.length)}):\n${alerts
              .slice(0, 8)
              .map((a) => `• [${a.severity}] ${a.title}`)
              .join("\n")}`
          : "هیچ ئاگادارییەکی چالاک نییە.",
        links: [{ label: "ئاگادارییەکان", href: "/dashboard/notifications" }],
      };
    }

    case "search_general": {
      const q = parsed.query || "";
      const hits = await runEnterpriseSearch({ companyId, query: q });
      const items = hits.groups.flatMap((g) => g.items).slice(0, 8);
      return {
        intent: "search_general",
        reply: items.length
          ? `ئەنجامی گەڕان بۆ «${q}» (${numKu(hits.total)}):\n${items
              .map((h) => `• ${h.title}${h.subtitle ? ` — ${h.subtitle}` : ""}`)
              .join("\n")}`
          : `هیچ ئەنجامێک بۆ «${q}» نەدۆزرایەوە.`,
        links: items.slice(0, 5).map((h) => ({ label: h.title, href: h.href })),
      };
    }

    case "help":
      return {
        intent: "help",
        reply: `من یاریدەدەری ERPـی ڕێکم. تەنها لەسەر داتای ڕاستەقینە وەڵام دەدەمەوە.\n\nنمونەی پرسیار:\n${AI_SUGGESTED_PROMPTS.map((p) => `• ${p}`).join("\n")}`,
        links: [
          { label: "یاریدەدەری زیرەک", href: "/dashboard/ai-assistant" },
          { label: "داشبۆرد", href: "/dashboard" },
        ],
        suggestions: AI_SUGGESTED_PROMPTS.slice(0, 6),
      };

    default:
      return {
        intent: "unknown",
        reply:
          "ئەم پرسیارەم تێنەگەیشتم یان لە داتای سیستەمدا وەڵامێکی ڕاستەوخۆی نییە. تکایە پرسیارێکی دیکە هەڵبژێرە — من ژمارەی خەیاڵی دروست ناکەم.",
        suggestions: AI_SUGGESTED_PROMPTS.slice(0, 6),
        links: [{ label: "یاریدەدەری زیرەک", href: "/dashboard/ai-assistant" }],
      };
  }
}
