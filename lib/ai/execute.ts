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
        reply: `Today's sales: ${sales.length} orders · ${money(total)}.\n${lines || "No sales recorded yet today."}`,
        links: [
          { label: "Open Sales", href: "/dashboard/sales" },
          { label: "Analytics", href: "/dashboard/analytics" },
        ],
        data: { count: sales.length, total },
        suggestions: ["Compare this month with last month", "Sales analysis"],
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
        reply: `Stock alerts: ${analytics.summary.lowStockCount} low · ${analytics.summary.outOfStockCount} out of stock.\n${lines || "Inventory looks healthy."}`,
        links: [
          { label: "Inventory", href: "/dashboard/inventory" },
          { label: "Products", href: "/dashboard/products" },
        ],
        data: {
          lowStockCount: analytics.summary.lowStockCount,
          outOfStockCount: analytics.summary.outOfStockCount,
        },
        suggestions: ["Show smart recommendations", "Inventory analysis"],
      };
    }

    case "create_invoice":
      return {
        intent: "create_invoice",
        reply:
          "Ready to create a new invoice. Open New Sale — a completed sale generates the invoice automatically.",
        links: [
          { label: "New Sale / Invoice", href: "/dashboard/sales/new" },
          { label: "Invoices", href: "/dashboard/invoices" },
        ],
        suggestions: ["Show today's sales", "Show unpaid invoices"],
      };

    case "search_customer": {
      const q = parsed.query || "";
      if (!q) {
        return {
          intent: "search_customer",
          reply: "Tell me the customer name, e.g. “Search customer Ahmed”.",
          links: [{ label: "Customers", href: "/dashboard/customers" }],
          suggestions: ["Search customer Ahmed"],
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
          { label: "Customers", href: "/dashboard/customers" },
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
        reply: `Credit / unpaid sales: ${credit.length} · ${money(total)} outstanding.\n${lines || "No credit sales found."}`,
        links: [
          { label: "Sales", href: "/dashboard/sales" },
          { label: "Invoices", href: "/dashboard/invoices" },
          { label: "Customers", href: "/dashboard/customers" },
        ],
        data: { count: credit.length, total },
        suggestions: ["Customer insights", "Show active alerts"],
      };
    }

    case "monthly_report": {
      const report = await buildReports(companyId, {
        preset: "month",
        granularity: "daily",
      });
      return {
        intent: "monthly_report",
        reply: `Monthly report summary:\n• Revenue ${money(report.summary.revenue)}\n• Expenses ${money(report.summary.expenses)}\n• Profit ${money(report.summary.profit)}\n• Sales ${report.summary.salesCount} · Purchases ${report.summary.purchasesCount}`,
        links: [
          { label: "Open Reports", href: "/dashboard/reports" },
          { label: "Analytics", href: "/dashboard/analytics" },
        ],
        data: report.summary as unknown as Record<string, unknown>,
        suggestions: ["Compare this month with last month", "Profit and loss summary"],
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
        reply: `This month vs last month:\n• Revenue ${money(thisM.revenueThisMonth)} vs ${money(lastRev)} (${pct >= 0 ? "+" : ""}${pct}%)\n• Expenses ${money(thisM.expensesThisMonth)} vs ${money(lastExp)}\n• Profit ${money(thisM.profitThisMonth)} vs ${money(lastRev - lastExp)}\n• Orders ${thisM.salesCountThisMonth} vs ${lastSales._count}`,
        links: [
          { label: "Analytics", href: "/dashboard/analytics" },
          { label: "Reports", href: "/dashboard/reports" },
        ],
        suggestions: ["Sales analysis", "Generate monthly report"],
      };
    }

    case "sales_analysis":
      return {
        intent: "sales_analysis",
        reply: `Sales analysis:\n• Today ${money(analytics.summary.revenueToday)} · Month ${money(analytics.summary.revenueThisMonth)} · All-time ${money(analytics.summary.revenueTotal)}\n• Orders this month: ${analytics.summary.salesCountThisMonth}\n• Top product: ${analytics.topProducts[0]?.name || "—"}\n• Top customer: ${analytics.bestCustomers[0]?.name || "—"}`,
        links: [
          { label: "Sales", href: "/dashboard/sales" },
          { label: "Analytics", href: "/dashboard/analytics" },
        ],
        suggestions: ["Top customers", "Best selling products"],
      };

    case "purchase_analysis":
      return {
        intent: "purchase_analysis",
        reply: `Purchase analysis:\n• Today ${money(analytics.summary.expensesToday)} · Month ${money(analytics.summary.expensesThisMonth)} · All-time ${money(analytics.summary.expensesTotal)}\n• Purchases this month: ${analytics.summary.purchasesCountThisMonth}\n• Top supplier: ${analytics.topSuppliers[0]?.name || "—"}`,
        links: [
          { label: "Purchases", href: "/dashboard/purchases" },
          { label: "Suppliers", href: "/dashboard/suppliers" },
        ],
      };

    case "inventory_analysis":
      return {
        intent: "inventory_analysis",
        reply: `Inventory analysis:\n• Health score ${analytics.summary.inventoryHealthScore}%\n• Value ${money(analytics.summary.inventoryValue)} · Units ${analytics.summary.inventoryUnits}\n• Low ${analytics.summary.lowStockCount} · Out ${analytics.summary.outOfStockCount} · At min ${analytics.summary.atMinimumCount}\n• Products ${analytics.summary.productsCount} · Warehouses ${analytics.summary.warehousesCount}`,
        links: [
          { label: "Inventory", href: "/dashboard/inventory" },
          { label: "Warehouses", href: "/dashboard/werehouse" },
        ],
        suggestions: ["Find low stock products", "Show smart recommendations"],
      };

    case "profit_loss":
      return {
        intent: "profit_loss",
        reply: `Profit & Loss:\n• Today profit ${money(analytics.summary.profitToday)} (loss ${money(analytics.summary.lossToday)})\n• This month profit ${money(analytics.summary.profitThisMonth)} · Gross ${money(analytics.summary.grossProfitThisMonth)}\n• All-time profit ${money(analytics.summary.profitTotal)}`,
        links: [
          { label: "Reports", href: "/dashboard/reports" },
          { label: "Analytics", href: "/dashboard/analytics" },
        ],
      };

    case "customer_insights": {
      const tops = analytics.bestCustomers.slice(0, 5);
      return {
        intent: "customer_insights",
        reply: `Customer insights (${analytics.summary.customersCount} customers):\n${
          tops
            .map(
              (c, i) =>
                `${i + 1}. ${c.name} — ${c.orders} orders · ${money(c.revenue)}`
            )
            .join("\n") || "No customer sales yet."
        }`,
        links: [{ label: "Customers", href: "/dashboard/customers" }],
      };
    }

    case "supplier_performance": {
      const tops = analytics.topSuppliers.slice(0, 5);
      return {
        intent: "supplier_performance",
        reply: `Supplier performance (${analytics.summary.suppliersCount} suppliers):\n${
          tops
            .map(
              (s, i) =>
                `${i + 1}. ${s.name} — ${s.orders} orders · ${money(s.spent)}`
            )
            .join("\n") || "No supplier purchases yet."
        }`,
        links: [{ label: "Suppliers", href: "/dashboard/suppliers" }],
      };
    }

    case "employee_stats": {
      const [total, active] = await Promise.all([
        db.employee.count({ where: { companyId } }),
        db.employee.count({ where: { companyId, status: "ACTIVE" } }),
      ]);
      return {
        intent: "employee_stats",
        reply: `Employee statistics:\n• Total ${total} · Active ${active} · Inactive/other ${total - active}`,
        links: [
          { label: "Employees", href: "/dashboard/employees" },
          { label: "Employee reports", href: "/dashboard/employees/reports" },
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
        reply: `Warehouse performance:\n${lines || "No warehouses found."}`,
        links: [{ label: "Warehouses", href: "/dashboard/werehouse" }],
      };
    }

    case "recommendations": {
      const recs = await buildRecommendations(companyId, analytics);
      return {
        intent: "recommendations",
        reply: `Smart recommendations:\n${recs
          .slice(0, 6)
          .map((r, i) => `${i + 1}. ${r.title} — ${r.reason}`)
          .join("\n")}`,
        links: [
          { label: "AI Assistant", href: "/dashboard/ai-assistant" },
          { label: "Products", href: "/dashboard/products" },
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
          { label: "Notifications", href: "/dashboard/notifications" },
          { label: "AI Assistant", href: "/dashboard/ai-assistant" },
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
          { label: "Open AI Assistant", href: "/dashboard/ai-assistant" },
          { label: "Dashboard", href: "/dashboard" },
        ],
        suggestions: AI_SUGGESTED_PROMPTS.slice(0, 6),
      };

    default:
      return {
        intent: "unknown",
        reply:
          "I didn't catch that. Try “Show today's sales”, “Find low stock products”, or ask for help.",
        suggestions: AI_SUGGESTED_PROMPTS.slice(0, 5),
        links: [{ label: "AI Assistant", href: "/dashboard/ai-assistant" }],
      };
  }
}
