import { db } from "@/lib/prisma/db";
import { getCachedAnalytics } from "@/lib/cache/company-reads";
import { buildReports } from "@/lib/reports/buildReports";
import { runEnterpriseSearch } from "@/lib/search/enterpriseSearch";
import { formatMoney } from "@/lib/utils/format";
import type { ParsedIntent } from "@/lib/ai/parse";
import { AI_SUGGESTED_PROMPTS, type AiChatResponse } from "@/lib/ai/types";
import { buildRecommendations } from "@/lib/ai/recommendations";
import { listOpenAlerts } from "@/lib/ai/alerts";

function money(n: number) {
  return `${formatMoney(n)} IQD`;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(offset = 0) {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  d.setMonth(d.getMonth() + offset);
  return d;
}

/** Execute a parsed intent against company-scoped data only. */
export async function executeAiIntent(
  companyId: string,
  parsed: ParsedIntent
): Promise<AiChatResponse> {
  const analytics = await getCachedAnalytics(companyId);

  switch (parsed.intent) {
    case "today_sales": {
      const today = startOfToday();
      const sales = await db.sale.findMany({
        where: {
          companyId,
          status: "COMPLETED",
          saleDate: { gte: today },
        },
        select: {
          id: true,
          invoiceNo: true,
          total: true,
          customer: { select: { name: true } },
        },
        orderBy: { saleDate: "desc" },
        take: 10,
      });
      const total = sales.reduce((s, r) => s + Number(r.total), 0);
      const lines = sales
        .slice(0, 5)
        .map(
          (s) =>
            `• ${s.invoiceNo} — ${s.customer.name} — ${money(Number(s.total))}`
        )
        .join("\n");
      return {
        intent: "today_sales",
        reply: `فرۆشتنەکانی ئەمڕۆ: ${sales.length} داواکاری · ${money(total)}.\n${lines || "ئەمڕۆ هیچ فرۆشتنێک تۆمار نەکراوە."}`,
        links: [
          { label: "کردنەوەی فرۆشتن", href: "/dashboard/sales" },
          { label: "شیکاری", href: "/dashboard/analytics" },
        ],
        data: { count: sales.length, total },
        suggestions: ["بەراوردکردنی ئەم مانگە لەگەڵ مانگی پێشوو", "شیکاری فرۆشتن"],
      };
    }

    case "low_stock": {
      const low = analytics.lowStock.slice(0, 8);
      const out = analytics.outOfStock.slice(0, 5);
      const lines = [
        ...low.map(
          (p) =>
            `• ${p.name} (${p.sku}) — ${p.currentStock}/${p.minimumStock} ${p.unit}`
        ),
        ...out.map((p) => `• OUT · ${p.name} (${p.sku})`),
      ].join("\n");
      return {
        intent: "low_stock",
        reply: `ئاگاداری کۆگا: ${analytics.summary.lowStockCount} کەم · ${analytics.summary.outOfStockCount} بەتاڵە.\n${lines || "ئینڤێنتۆری باش دیارە."}`,
        links: [
          { label: "ئینڤێنتۆری", href: "/dashboard/inventory" },
          { label: "بەرهەمەکان", href: "/dashboard/products" },
        ],
        data: {
          lowStockCount: analytics.summary.lowStockCount,
          outOfStockCount: analytics.summary.outOfStockCount,
        },
        suggestions: ["پێشنیارە زیرەکەکان پیشان بدە", "شیکاری ئینڤێنتۆری"],
      };
    }

    case "create_invoice":
      return {
        intent: "create_invoice",
        reply:
          "ئامادەیت بۆ دروستکردنی پسوولەی نوێ. فرۆشتنی نوێ بکەرەوە — فرۆشتنی تەواوکراو خۆکارانە پسوولە دروست دەکات.",
        links: [
          { label: "فرۆشتن / پسوولەی نوێ", href: "/dashboard/sales/new" },
          { label: "پسوولەکان", href: "/dashboard/invoices" },
        ],
        suggestions: ["فرۆشتنەکانی ئەمڕۆ پیشان بدە", "پسوولە نەدراوەکان پیشان بدە"],
      };

    case "search_customer": {
      const q = parsed.query || "";
      if (!q) {
        return {
          intent: "search_customer",
          reply: "ناوی کڕیارەکەم پێ بڵێ، بۆ نموونە «گەڕان بۆ کڕیار ئەحمەد».",
          links: [{ label: "کڕیارەکان", href: "/dashboard/customers" }],
          suggestions: ["گەڕان بۆ کڕیار ئەحمەد"],
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
          ? `Found ${hits.total} customer match(es) for “${q}”:\n${items
              .map((h) => `• ${h.title}${h.subtitle ? ` — ${h.subtitle}` : ""}`)
              .join("\n")}`
          : `No customers matched “${q}”.`,
        links: [
          { label: "کڕیارەکان", href: "/dashboard/customers" },
          ...items.slice(0, 3).map((h) => ({ label: h.title, href: h.href })),
        ],
        data: { total: hits.total },
      };
    }

    case "unpaid_invoices": {
      const credit = await db.sale.findMany({
        where: {
          companyId,
          status: "COMPLETED",
          paymentMethod: "CREDIT",
        },
        select: {
          id: true,
          invoiceNo: true,
          total: true,
          saleDate: true,
          customer: { select: { name: true } },
          invoice: { select: { id: true, status: true } },
        },
        orderBy: { saleDate: "desc" },
        take: 15,
      });
      const total = credit.reduce((s, r) => s + Number(r.total), 0);
      const lines = credit
        .slice(0, 6)
        .map(
          (s) =>
            `• ${s.invoiceNo} — ${s.customer.name} — ${money(Number(s.total))}`
        )
        .join("\n");
      return {
        intent: "unpaid_invoices",
        reply: `فرۆشتنەکانی قەرز / نەدراو: ${credit.length} · ${money(total)} ماوە.\n${lines || "هیچ فرۆشتنی قەرزێک نەدۆزرایەوە."}`,
        links: [
          { label: "فرۆشتن", href: "/dashboard/sales" },
          { label: "پسوولەکان", href: "/dashboard/invoices" },
          { label: "کڕیارەکان", href: "/dashboard/customers" },
        ],
        data: { count: credit.length, total },
        suggestions: ["تێڕوانینی کڕیار", "ئاگاداری چالاکەکان پیشان بدە"],
      };
    }

    case "monthly_report": {
      const report = await buildReports(companyId, {
        preset: "month",
        granularity: "daily",
      });
      return {
        intent: "monthly_report",
        reply: `پوختەی ڕاپۆرتی مانگانە:\n• داهات ${money(report.summary.revenue)}\n• خەرجی ${money(report.summary.expenses)}\n• قازانج ${money(report.summary.profit)}\n• فرۆشتن ${report.summary.salesCount} · کڕین ${report.summary.purchasesCount}`,
        links: [
          { label: "کردنەوەی ڕاپۆرتەکان", href: "/dashboard/reports" },
          { label: "شیکاری", href: "/dashboard/analytics" },
        ],
        data: report.summary as unknown as Record<string, unknown>,
        suggestions: ["بەراوردکردنی ئەم مانگە لەگەڵ مانگی پێشوو", "پوختەی قازانج و زیان"],
      };
    }

    case "compare_months": {
      const thisM = analytics.summary;
      const lastStart = startOfMonth(-1);
      const thisStart = startOfMonth(0);
      const [lastSales, lastPurchases] = await Promise.all([
        db.sale.aggregate({
          where: {
            companyId,
            status: "COMPLETED",
            saleDate: { gte: lastStart, lt: thisStart },
          },
          _sum: { total: true },
          _count: true,
        }),
        db.purchase.aggregate({
          where: {
            companyId,
            status: "COMPLETED",
            purchaseDate: { gte: lastStart, lt: thisStart },
          },
          _sum: { total: true },
          _count: true,
        }),
      ]);
      const lastRev = Number(lastSales._sum.total || 0);
      const lastExp = Number(lastPurchases._sum.total || 0);
      const revDelta = thisM.revenueThisMonth - lastRev;
      const pct =
        lastRev > 0 ? Math.round((revDelta / lastRev) * 100) : thisM.revenueThisMonth > 0 ? 100 : 0;
      return {
        intent: "compare_months",
        reply: `ئەم مانگە بەرامبەر مانگی پێشوو:\n• داهات ${money(thisM.revenueThisMonth)} vs ${money(lastRev)} (${pct >= 0 ? "+" : ""}${pct}%)\n• خەرجی ${money(thisM.expensesThisMonth)} vs ${money(lastExp)}\n• قازانج ${money(thisM.profitThisMonth)} vs ${money(lastRev - lastExp)}\n• داواکاری ${thisM.salesCountThisMonth} vs ${lastSales._count}`,
        links: [
          { label: "شیکاری", href: "/dashboard/analytics" },
          { label: "ڕاپۆرتەکان", href: "/dashboard/reports" },
        ],
        suggestions: ["شیکاری فرۆشتن", "دروستکردنی ڕاپۆرتی مانگانە"],
      };
    }

    case "sales_analysis":
      return {
        intent: "sales_analysis",
        reply: `شیکاری فرۆشتن:\n• ئەمڕۆ ${money(analytics.summary.revenueToday)} · مانگ ${money(analytics.summary.revenueThisMonth)} · هەموو کات ${money(analytics.summary.revenueTotal)}\n• داواکاری this month: ${analytics.summary.salesCountThisMonth}\n• باشترین بەرهەم: ${analytics.topProducts[0]?.name || "—"}\n• باشترین کڕیار: ${analytics.bestCustomers[0]?.name || "—"}`,
        links: [
          { label: "فرۆشتن", href: "/dashboard/sales" },
          { label: "شیکاری", href: "/dashboard/analytics" },
        ],
        suggestions: ["باشترین کڕیارەکان", "زۆرترین فرۆشراوەکان"],
      };

    case "purchase_analysis":
      return {
        intent: "purchase_analysis",
        reply: `شیکاری کڕین:\n• ئەمڕۆ ${money(analytics.summary.expensesToday)} · مانگ ${money(analytics.summary.expensesThisMonth)} · هەموو کات ${money(analytics.summary.expensesTotal)}\n• کڕینەکانی ئەم مانگە: ${analytics.summary.purchasesCountThisMonth}\n• باشترین دابینکەر: ${analytics.topSuppliers[0]?.name || "—"}`,
        links: [
          { label: "کڕین", href: "/dashboard/purchases" },
          { label: "دابینکەران", href: "/dashboard/suppliers" },
        ],
      };

    case "inventory_analysis":
      return {
        intent: "inventory_analysis",
        reply: `شیکاری ئینڤێنتۆری:\n• نمرەی تەندروستی ${analytics.summary.inventoryHealthScore}%\n• بەها ${money(analytics.summary.inventoryValue)} · یەکە ${analytics.summary.inventoryUnits}\n• کەم ${analytics.summary.lowStockCount} · بەتاڵ ${analytics.summary.outOfStockCount} · لە کەمترین ${analytics.summary.atMinimumCount}\n• بەرهەمەکان ${analytics.summary.productsCount} · کۆگاکان ${analytics.summary.warehousesCount}`,
        links: [
          { label: "ئینڤێنتۆری", href: "/dashboard/inventory" },
          { label: "کۆگاکان", href: "/dashboard/werehouse" },
        ],
        suggestions: ["دۆزینەوەی بەرهەمە کەمەکان", "پێشنیارە زیرەکەکان پیشان بدە"],
      };

    case "profit_loss":
      return {
        intent: "profit_loss",
        reply: `قازانج و زیان:\n• ئەمڕۆ profit ${money(analytics.summary.profitToday)} (زیان ${money(analytics.summary.lossToday)})\n• قازانجی ئەم مانگە ${money(analytics.summary.profitThisMonth)} · قازانجی گشتی ${money(analytics.summary.grossProfitThisMonth)}\n• قازانجی هەموو کات ${money(analytics.summary.profitTotal)}`,
        links: [
          { label: "ڕاپۆرتەکان", href: "/dashboard/reports" },
          { label: "شیکاری", href: "/dashboard/analytics" },
        ],
      };

    case "customer_insights": {
      const tops = analytics.bestCustomers.slice(0, 5);
      return {
        intent: "customer_insights",
        reply: `تێڕوانینی کڕیار (${analytics.summary.customersCount} customers):\n${
          tops
            .map(
              (c, i) =>
                `${i + 1}. ${c.name} — ${c.orders} داواکاری · ${money(c.revenue)}`
            )
            .join("\n") || "No customer sales yet."
        }`,
        links: [{ label: "کڕیارەکان", href: "/dashboard/customers" }],
      };
    }

    case "supplier_performance": {
      const tops = analytics.topSuppliers.slice(0, 5);
      return {
        intent: "supplier_performance",
        reply: `ئەدای دابینکەر (${analytics.summary.suppliersCount} suppliers):\n${
          tops
            .map(
              (s, i) =>
                `${i + 1}. ${s.name} — ${s.orders} داواکاری · ${money(s.spent)}`
            )
            .join("\n") || "No supplier purchases yet."
        }`,
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
        reply: `ئاماری کارمەندان:\n• کۆی ${total} · چالاک ${active} · ناچالاک/هیتر ${total - active}`,
        links: [
          { label: "کارمەندان", href: "/dashboard/employees" },
          { label: "ڕاپۆرتەکانی کارمەند", href: "/dashboard/employees/reports" },
        ],
      };
    }

    case "warehouse_performance": {
      const lines = analytics.warehouseStats
        .slice(0, 6)
        .map(
          (w) =>
            `• ${w.name}${w.isMain ? " (main)" : ""} — ${w.status} · sales ${money(w.sales)}`
        )
        .join("\n");
      return {
        intent: "warehouse_performance",
        reply: `ئەدای کۆگا:\n${lines || "هیچ کۆگایەک نەدۆزرایەوە."}`,
        links: [{ label: "کۆگاکان", href: "/dashboard/werehouse" }],
      };
    }

    case "recommendations": {
      const recs = await buildRecommendations(companyId, analytics);
      return {
        intent: "recommendations",
        reply: `پێشنیارە زیرەکەکان:\n${recs
          .slice(0, 6)
          .map((r, i) => `${i + 1}. ${r.title} — ${r.reason}`)
          .join("\n")}`,
        links: [
          { label: "یاریدەدەری زیرەک", href: "/dashboard/ai-assistant" },
          { label: "بەرهەمەکان", href: "/dashboard/products" },
        ],
        data: { recommendations: recs },
      };
    }

    case "alerts": {
      const alerts = await listOpenAlerts(companyId);
      return {
        intent: "alerts",
        reply: alerts.length
          ? `Active alerts (${alerts.length}):\n${alerts
              .slice(0, 8)
              .map((a) => `• [${a.severity}] ${a.title}`)
              .join("\n")}`
          : "No open AI alerts. Inventory and credit look calm.",
        links: [
          { label: "ئاگادارییەکان", href: "/dashboard/notifications" },
          { label: "یاریدەدەری زیرەک", href: "/dashboard/ai-assistant" },
        ],
      };
    }

    case "search_general": {
      const q = parsed.query || "";
      const hits = await runEnterpriseSearch({ companyId, query: q });
      const items = hits.groups.flatMap((g) => g.items).slice(0, 8);
      return {
        intent: "search_general",
        reply: items.length
          ? `Search results for “${q}” (${hits.total}):\n${items
              .map((h) => `• ${h.title}${h.subtitle ? ` — ${h.subtitle}` : ""}`)
              .join("\n")}`
          : `No results for “${q}”. Try a product SKU, customer name, or invoice number.`,
        links: items.slice(0, 5).map((h) => ({ label: h.title, href: h.href })),
      };
    }

    case "help":
      return {
        intent: "help",
        reply: `I'm your ERP AI Assistant. Try:\n${AI_SUGGESTED_PROMPTS.map((p) => `• ${p}`).join("\n")}`,
        links: [
          { label: "کردنەوەی یاریدەدەری زیرەک", href: "/dashboard/ai-assistant" },
          { label: "داشبۆرد", href: "/dashboard" },
        ],
        suggestions: AI_SUGGESTED_PROMPTS.slice(0, 6),
      };

    default:
      return {
        intent: "unknown",
        reply:
          "I didn't catch that. Try “فرۆشتنەکانی ئەمڕۆ پیشان بدە”, “دۆزینەوەی بەرهەمە کەمەکان”, or ask for help.",
        suggestions: AI_SUGGESTED_PROMPTS.slice(0, 5),
        links: [{ label: "یاریدەدەری زیرەک", href: "/dashboard/ai-assistant" }],
      };
  }
}
