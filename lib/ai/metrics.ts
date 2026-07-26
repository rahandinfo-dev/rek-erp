import { db } from "@/lib/prisma/db";
import { formatMoney, formatNumber } from "@/lib/utils/format";

/** Reporting windows for ERP assistant metrics (company-scoped). */
export type MetricPeriod = "today" | "week" | "month" | "last_month";

export type PeriodRange = {
  period: MetricPeriod;
  start: Date;
  end: Date;
  labelKu: string;
};

const PERIOD_LABEL: Record<MetricPeriod, string> = {
  today: "ئەمڕۆ",
  week: "ئەم هەفتەیە",
  month: "ئەم مانگە",
  last_month: "مانگی پێشوو",
};

export function moneyKu(n: number) {
  return `${formatMoney(n)} دینار`;
}

export function numKu(n: number, digits = 0) {
  return formatNumber(n, digits);
}

export function periodLabel(period: MetricPeriod) {
  return PERIOD_LABEL[period];
}

export function getPeriodRange(
  period: MetricPeriod,
  now = new Date()
): PeriodRange {
  const end = new Date(now);
  const start = new Date(now);

  if (period === "today") {
    start.setHours(0, 0, 0, 0);
  } else if (period === "week") {
    const day = start.getDay();
    const diff = (day + 6) % 7; // Monday-start week
    start.setDate(start.getDate() - diff);
    start.setHours(0, 0, 0, 0);
  } else if (period === "month") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  } else {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    start.setMonth(start.getMonth() - 1);
    end.setDate(1);
    end.setHours(0, 0, 0, 0);
  }

  return {
    period,
    start,
    end: period === "last_month" ? end : new Date(now),
    labelKu: PERIOD_LABEL[period],
  };
}

function rangeEnd(period: MetricPeriod, range: PeriodRange) {
  return period === "last_month" ? range.end : new Date(Date.now() + 60_000);
}

async function sumSales(
  companyId: string,
  start: Date,
  end: Date
): Promise<{ total: number; count: number }> {
  const agg = await db.sale.aggregate({
    where: {
      companyId,
      status: "COMPLETED",
      saleDate: { gte: start, lt: end },
    },
    _sum: { total: true },
    _count: true,
  });
  return {
    total: Number(agg._sum.total || 0),
    count: agg._count,
  };
}

async function sumPurchases(
  companyId: string,
  start: Date,
  end: Date
): Promise<{ total: number; count: number }> {
  const agg = await db.purchase.aggregate({
    where: {
      companyId,
      status: "COMPLETED",
      purchaseDate: { gte: start, lt: end },
    },
    _sum: { total: true },
    _count: true,
  });
  return {
    total: Number(agg._sum.total || 0),
    count: agg._count,
  };
}

/** کۆی فرۆشتن (تەنها فرۆشتنی تەواوکراو). */
export async function getSalesTotal(companyId: string, period: MetricPeriod) {
  const range = getPeriodRange(period);
  const data = await sumSales(companyId, range.start, rangeEnd(period, range));
  return { ...data, range, empty: data.count === 0 && data.total === 0 };
}

/** کۆی خەرجی = کۆی کڕینی تەواوکراو. */
export async function getExpensesTotal(companyId: string, period: MetricPeriod) {
  const range = getPeriodRange(period);
  const data = await sumPurchases(
    companyId,
    range.start,
    rangeEnd(period, range)
  );
  return { ...data, range, empty: data.count === 0 && data.total === 0 };
}

/**
 * قازانجی ساف = کۆی فرۆشتن − کۆی کڕین بۆ هەمان ماوە.
 * تەنها لەسەر تۆماری داتابەیس — هیچ خەملاندنێک نییە.
 */
export async function getNetProfit(companyId: string, period: MetricPeriod) {
  const [sales, expenses] = await Promise.all([
    getSalesTotal(companyId, period),
    getExpensesTotal(companyId, period),
  ]);
  return {
    net: sales.total - expenses.total,
    sales: sales.total,
    expenses: expenses.total,
    salesCount: sales.count,
    purchasesCount: expenses.count,
    range: sales.range,
    empty: sales.empty && expenses.empty,
  };
}

/** قەرزی کڕیاران = کۆی فرۆشتنی CREDIT تەواوکراو. */
export async function getCustomerDebt(companyId: string) {
  const rows = await db.sale.findMany({
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
    },
    orderBy: { saleDate: "desc" },
    take: 50,
  });
  const total = rows.reduce((s, r) => s + Number(r.total), 0);
  return {
    total,
    count: rows.length,
    samples: rows.slice(0, 8).map((r) => ({
      invoiceNo: r.invoiceNo,
      customer: r.customer.name,
      total: Number(r.total),
      saleDate: r.saleDate.toISOString(),
    })),
    empty: rows.length === 0,
    definitionKu:
      "قەرز لەسەر فرۆشتنەکانی شێوازی «قەرز / CREDIT» حیساب دەکرێت. ئەگەر پارەدان جیاواز تۆمار نەکرابێت، کۆی تەواوی ئەو فرۆشتانە وەک قەرزی ماوە پیشان دەدرێت.",
  };
}

/** قەرزی دابینکەران — لە مۆدێلی ئێستادا پشتگیری ناکرێت. */
export async function getSupplierDebtStatus() {
  return {
    supported: false as const,
    messageKu:
      "لە سیستەمی ئێستادا قەرزی دابینکەران (پارەدانی کڕین / حسابی قەرز) تۆمار ناکرێت. تەنها کۆی کڕینە تەواوکراوەکان هەیە، نەک باڵانسی قەرز. هیچ ژمارەیەکی قەرز دروست ناکرێت.",
  };
}

export async function getTopSellingProduct(
  companyId: string,
  period: MetricPeriod = "month"
) {
  const range = getPeriodRange(period);
  const end = rangeEnd(period, range);

  const groups = await db.saleItem.groupBy({
    by: ["productId"],
    where: {
      sale: {
        companyId,
        status: "COMPLETED",
        saleDate: { gte: range.start, lt: end },
      },
    },
    _sum: { quantity: true, total: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: 5,
  });

  if (!groups.length) {
    return { empty: true as const, range, items: [] as const };
  }

  const products = await db.product.findMany({
    where: { companyId, id: { in: groups.map((g) => g.productId) } },
    select: { id: true, name: true, sku: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const items = groups.map((g) => {
    const p = byId.get(g.productId);
    return {
      productId: g.productId,
      name: p?.name || "—",
      sku: p?.sku || "—",
      quantity: Number(g._sum.quantity || 0),
      revenue: Number(g._sum.total || 0),
    };
  });

  return { empty: false as const, range, items, top: items[0]! };
}

export async function getLeastSellingProduct(
  companyId: string,
  period: MetricPeriod = "month"
) {
  const range = getPeriodRange(period);
  const end = rangeEnd(period, range);

  const groups = await db.saleItem.groupBy({
    by: ["productId"],
    where: {
      sale: {
        companyId,
        status: "COMPLETED",
        saleDate: { gte: range.start, lt: end },
      },
    },
    _sum: { quantity: true, total: true },
    orderBy: { _sum: { quantity: "asc" } },
    take: 5,
  });

  if (!groups.length) {
    return { empty: true as const, range, items: [] as const };
  }

  const products = await db.product.findMany({
    where: { companyId, id: { in: groups.map((g) => g.productId) } },
    select: { id: true, name: true, sku: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));
  const items = groups.map((g) => {
    const p = byId.get(g.productId);
    return {
      productId: g.productId,
      name: p?.name || "—",
      sku: p?.sku || "—",
      quantity: Number(g._sum.quantity || 0),
      revenue: Number(g._sum.total || 0),
    };
  });

  return { empty: false as const, range, items, least: items[0]! };
}

export async function getLowStockProducts(companyId: string) {
  const products = await db.product.findMany({
    where: { companyId, active: true },
    select: {
      id: true,
      name: true,
      sku: true,
      currentStock: true,
      minimumStock: true,
      unit: { select: { symbol: true } },
    },
    orderBy: { currentStock: "asc" },
    take: 500,
  });

  const low = products.filter((p) => {
    const stock = Number(p.currentStock);
    const min = Number(p.minimumStock);
    return stock <= 0 || (min > 0 && stock <= min);
  });

  const out = low.filter((p) => Number(p.currentStock) <= 0);
  const near = low.filter((p) => Number(p.currentStock) > 0);

  return {
    empty: low.length === 0,
    lowCount: near.length,
    outCount: out.length,
    items: low.slice(0, 12).map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      currentStock: Number(p.currentStock),
      minimumStock: Number(p.minimumStock),
      unit: p.unit.symbol,
    })),
  };
}

export async function getStockUnits(companyId: string) {
  const products = await db.product.findMany({
    where: { companyId, active: true },
    select: { currentStock: true },
  });
  const units = products.reduce((s, p) => s + Number(p.currentStock), 0);
  return {
    productCount: products.length,
    units,
    empty: products.length === 0,
  };
}

export async function getTodayInvoiceCount(companyId: string) {
  const start = getPeriodRange("today").start;
  const count = await db.invoice.count({
    where: {
      companyId,
      invoiceDate: { gte: start },
    },
  });
  return { count, empty: count === 0 };
}

export async function getUserCount(companyId: string) {
  const count = await db.user.count({ where: { companyId } });
  return { count, empty: count === 0 };
}

export async function getWeeklyTransactions(companyId: string) {
  const range = getPeriodRange("week");
  const end = rangeEnd("week", range);
  const [sales, purchases] = await Promise.all([
    sumSales(companyId, range.start, end),
    sumPurchases(companyId, range.start, end),
  ]);
  return {
    salesCount: sales.count,
    purchasesCount: purchases.count,
    totalCount: sales.count + purchases.count,
    salesTotal: sales.total,
    purchasesTotal: purchases.total,
    range,
    empty: sales.count + purchases.count === 0,
  };
}

export async function getProfitMonthOverMonth(companyId: string) {
  const [thisMonth, lastMonth] = await Promise.all([
    getNetProfit(companyId, "month"),
    getNetProfit(companyId, "last_month"),
  ]);
  const delta = thisMonth.net - lastMonth.net;
  const pct =
    lastMonth.net !== 0
      ? Math.round((delta / Math.abs(lastMonth.net)) * 1000) / 10
      : thisMonth.net !== 0
        ? 100
        : 0;
  const direction: "up" | "down" | "flat" =
    delta > 0 ? "up" : delta < 0 ? "down" : "flat";

  return {
    thisMonth,
    lastMonth,
    delta,
    pct,
    direction,
    empty: thisMonth.empty && lastMonth.empty,
  };
}
