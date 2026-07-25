import { db } from "@/lib/prisma/db";
import {
  getCachedDashboardChartData,
  getCachedInventorySummary,
} from "@/lib/cache/company-reads";
import { timeAgoKu } from "@/lib/notifications/create";
import { isAlertsPanelKind } from "@/lib/notifications/kinds";

export type DashboardSummary = {
  productsCount: number;
  todayRevenue: number;
  todaySalesCount: number;
  lowStockCount: number;
  outOfStockCount: number;
};

export type DashboardRecentSale = {
  id: string;
  invoiceNo: string;
  customerName: string;
  total: number;
  saleDate: string;
  timeAgo: string;
};

export type DashboardRecentInvoice = {
  id: string;
  invoiceNo: string;
  customerName: string;
  grandTotal: number;
  invoiceDate: string;
  timeAgo: string;
};

export async function loadDashboardHome(companyId: string) {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const [
    summaryRows,
    recentSales,
    recentInvoices,
    recentActivities,
    inventoryAlertRows,
    chartData,
    inventorySummary,
  ] = await Promise.all([
    db.$queryRaw<
      Array<{
        productsCount: unknown;
        todayRevenue: unknown;
        todaySalesCount: unknown;
      }>
    >`
      SELECT
        (
          SELECT COUNT(*)::int
          FROM "Product"
          WHERE "companyId" = ${companyId} AND active = true
        ) AS "productsCount",
        (
          SELECT COALESCE(SUM(total), 0)
          FROM "Sale"
          WHERE "companyId" = ${companyId}
            AND status = 'COMPLETED'
            AND "saleDate" >= ${startOfToday}
        ) AS "todayRevenue",
        (
          SELECT COUNT(*)::int
          FROM "Sale"
          WHERE "companyId" = ${companyId}
            AND status = 'COMPLETED'
            AND "saleDate" >= ${startOfToday}
        ) AS "todaySalesCount"
    `,
    db.sale.findMany({
      where: { companyId, status: "COMPLETED" },
      orderBy: [{ saleDate: "desc" }, { createdAt: "desc" }],
      take: 5,
      select: {
        id: true,
        invoiceNo: true,
        total: true,
        saleDate: true,
        createdAt: true,
        customer: { select: { name: true } },
      },
    }),
    db.invoice.findMany({
      where: { companyId },
      orderBy: [{ invoiceDate: "desc" }, { createdAt: "desc" }],
      take: 5,
      select: {
        id: true,
        invoiceNo: true,
        customerName: true,
        grandTotal: true,
        invoiceDate: true,
        createdAt: true,
      },
    }),
    db.notification.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        title: true,
        message: true,
        category: true,
        priority: true,
        isRead: true,
        href: true,
        createdAt: true,
        metadata: true,
      },
    }),
    db.notification.findMany({
      where: {
        companyId,
        deletedAt: null,
        OR: [
          { category: { in: ["INVENTORY", "WAREHOUSE", "WARNING"] } },
          { priority: { in: ["HIGH", "CRITICAL"] } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        title: true,
        message: true,
        category: true,
        priority: true,
        isRead: true,
        href: true,
        createdAt: true,
        metadata: true,
      },
    }),
    getCachedDashboardChartData(companyId),
    getCachedInventorySummary(companyId),
  ]);

  const row = summaryRows[0];
  const summary: DashboardSummary = {
    productsCount: Number(row?.productsCount ?? 0),
    todayRevenue: Number(row?.todayRevenue ?? 0),
    todaySalesCount: Number(row?.todaySalesCount ?? 0),
    lowStockCount: inventorySummary.lowStockCount,
    outOfStockCount: inventorySummary.outOfStockCount,
  };

  const sales: DashboardRecentSale[] = recentSales.map((s) => ({
    id: s.id,
    invoiceNo: s.invoiceNo,
    customerName: s.customer?.name || "—",
    total: Number(s.total),
    saleDate: s.saleDate.toISOString(),
    timeAgo: timeAgoKu(s.createdAt),
  }));

  const invoices: DashboardRecentInvoice[] = recentInvoices.map((inv) => ({
    id: inv.id,
    invoiceNo: inv.invoiceNo,
    customerName: inv.customerName || "—",
    grandTotal: Number(inv.grandTotal),
    invoiceDate: inv.invoiceDate.toISOString(),
    timeAgo: timeAgoKu(inv.createdAt),
  }));

  const activityItems = recentActivities.map((item) => ({
    id: item.id,
    title: item.title,
    message: item.message,
    category: item.category,
    priority: item.priority,
    isRead: item.isRead,
    href: item.href,
    timeAgo: timeAgoKu(item.createdAt),
    date: item.createdAt.toISOString(),
  }));

  const warehouseAlerts = inventoryAlertRows
    .filter((item) => {
      const meta = item.metadata as { kind?: string } | null;
      const kind = typeof meta?.kind === "string" ? meta.kind : null;
      return (
        isAlertsPanelKind(kind) ||
        ((item.category === "INVENTORY" ||
          item.category === "WAREHOUSE" ||
          item.category === "WARNING") &&
          (item.priority === "HIGH" || item.priority === "CRITICAL"))
      );
    })
    .slice(0, 6)
    .map((item) => {
      const meta = item.metadata as { kind?: string } | null;
      return {
        id: item.id,
        title: item.title,
        message: item.message,
        category: item.category,
        priority: item.priority,
        isRead: item.isRead,
        href: item.href,
        timeAgo: timeAgoKu(item.createdAt),
        date: item.createdAt.toISOString(),
        kind: typeof meta?.kind === "string" ? meta.kind : null,
      };
    });

  return {
    summary,
    sales,
    invoices,
    activityItems,
    warehouseAlerts,
    chartData,
  };
}
