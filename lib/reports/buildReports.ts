import { db } from "@/lib/prisma/db";
import {
  type ChartGranularity,
  type DateRange,
  resolveDateRange,
  type DateRangePreset,
} from "@/lib/reports/dateRange";

export type ReportChartPoint = {
  name: string;
  sales: number;
  purchases: number;
  profit: number;
};

export type ReportsPayload = {
  generatedAt: string;
  range: {
    preset: DateRangePreset;
    from: string;
    to: string;
  };
  granularity: ChartGranularity;
  summary: {
    revenue: number;
    expenses: number;
    profit: number;
    salesCount: number;
    purchasesCount: number;
    averageSale: number;
    averagePurchase: number;
  };
  chart: ReportChartPoint[];
  latestSales: Array<{
    id: string;
    invoiceNo: string;
    total: number;
    customer: string;
    date: string;
  }>;
  latestPurchases: Array<{
    id: string;
    invoiceNo: string;
    total: number;
    supplier: string;
    date: string;
  }>;
  topProducts: Array<{
    id: string;
    name: string;
    sku: string;
    quantity: number;
    revenue: number;
  }>;
  topCustomers: Array<{
    id: string;
    name: string;
    orders: number;
    revenue: number;
  }>;
  topSuppliers: Array<{
    id: string;
    name: string;
    orders: number;
    spent: number;
  }>;
};

function num(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function weekKey(d: Date) {
  const tmp = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (tmp.getDay() + 6) % 7;
  tmp.setDate(tmp.getDate() - day);
  return dayKey(tmp);
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

function yearKey(d: Date) {
  return String(d.getFullYear());
}

function bucketKey(d: Date, granularity: ChartGranularity) {
  switch (granularity) {
    case "daily":
      return dayKey(d);
    case "weekly":
      return weekKey(d);
    case "yearly":
      return yearKey(d);
    default:
      return monthKey(d);
  }
}

function labelForKey(key: string, granularity: ChartGranularity) {
  if (granularity === "yearly") return key;
  if (granularity === "monthly") {
    const [y, m] = key.split("-");
    return `${Number(m)}/${y}`;
  }
  if (granularity === "weekly") {
    return `هەفتە ${key.slice(5)}`;
  }
  const [, m, day] = key.split("-");
  return `${Number(day)}/${Number(m)}`;
}

function enumerateBuckets(
  from: Date,
  to: Date,
  granularity: ChartGranularity
): string[] {
  const keys: string[] = [];

  if (granularity === "yearly") {
    for (let y = from.getFullYear(); y <= to.getFullYear(); y += 1) {
      keys.push(String(y));
    }
    return keys;
  }

  if (granularity === "monthly") {
    const c = new Date(from.getFullYear(), from.getMonth(), 1);
    const end = new Date(to.getFullYear(), to.getMonth(), 1);
    while (c <= end) {
      keys.push(monthKey(c));
      c.setMonth(c.getMonth() + 1);
    }
    return keys;
  }

  if (granularity === "weekly") {
    const c = new Date(from);
    const day = (c.getDay() + 6) % 7;
    c.setDate(c.getDate() - day);
    c.setHours(0, 0, 0, 0);
    const seen = new Set<string>();
    while (c <= to) {
      const k = weekKey(c);
      if (!seen.has(k)) {
        seen.add(k);
        keys.push(k);
      }
      c.setDate(c.getDate() + 7);
    }
    return keys;
  }

  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  while (cursor <= end) {
    keys.push(dayKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
}

export async function buildReports(
  companyId: string,
  input: {
    preset?: DateRangePreset;
    from?: string | null;
    to?: string | null;
    granularity?: ChartGranularity;
  } = {}
): Promise<ReportsPayload> {
  const range: DateRange = resolveDateRange(
    input.preset || "month",
    input.from,
    input.to
  );
  const granularity = input.granularity || "monthly";
  const { from, to } = range;

  const [sales, purchases, saleItems, saleByCustomer, purchaseBySupplier] =
    await Promise.all([
      db.sale.findMany({
        where: {
          companyId,
          status: "COMPLETED",
          saleDate: { gte: from, lte: to },
        },
        select: {
          id: true,
          invoiceNo: true,
          total: true,
          saleDate: true,
          customerId: true,
          customer: { select: { name: true } },
        },
        orderBy: { saleDate: "desc" },
        take: 5000,
      }),
      db.purchase.findMany({
        where: {
          companyId,
          status: "COMPLETED",
          purchaseDate: { gte: from, lte: to },
        },
        select: {
          id: true,
          invoiceNo: true,
          total: true,
          purchaseDate: true,
          supplierId: true,
          supplier: { select: { name: true } },
        },
        orderBy: { purchaseDate: "desc" },
        take: 5000,
      }),
      db.saleItem.groupBy({
        by: ["productId"],
        where: {
          sale: {
            companyId,
            status: "COMPLETED",
            saleDate: { gte: from, lte: to },
          },
        },
        _sum: { quantity: true, total: true },
        orderBy: { _sum: { total: "desc" } },
        take: 10,
      }),
      db.sale.groupBy({
        by: ["customerId"],
        where: {
          companyId,
          status: "COMPLETED",
          saleDate: { gte: from, lte: to },
        },
        _sum: { total: true },
        _count: { _all: true },
        orderBy: { _sum: { total: "desc" } },
        take: 10,
      }),
      db.purchase.groupBy({
        by: ["supplierId"],
        where: {
          companyId,
          status: "COMPLETED",
          purchaseDate: { gte: from, lte: to },
        },
        _sum: { total: true },
        _count: { _all: true },
        orderBy: { _sum: { total: "desc" } },
        take: 10,
      }),
    ]);

  const revenue = sales.reduce((acc, s) => acc + num(s.total), 0);
  const expenses = purchases.reduce((acc, p) => acc + num(p.total), 0);
  const salesCount = sales.length;
  const purchasesCount = purchases.length;

  const buckets = enumerateBuckets(from, to, granularity);
  const salesMap = new Map<string, number>();
  const purchasesMap = new Map<string, number>();

  for (const s of sales) {
    const k = bucketKey(s.saleDate, granularity);
    salesMap.set(k, (salesMap.get(k) || 0) + num(s.total));
  }
  for (const p of purchases) {
    const k = bucketKey(p.purchaseDate, granularity);
    purchasesMap.set(k, (purchasesMap.get(k) || 0) + num(p.total));
  }

  const chart: ReportChartPoint[] = buckets.map((key) => {
    const s = salesMap.get(key) || 0;
    const p = purchasesMap.get(key) || 0;
    return {
      name: labelForKey(key, granularity),
      sales: s,
      purchases: p,
      profit: s - p,
    };
  });

  const productIds = saleItems.map((g) => g.productId);
  const customerIds = saleByCustomer.map((g) => g.customerId);
  const supplierIds = purchaseBySupplier.map((g) => g.supplierId);

  const [products, customers, suppliers] = await Promise.all([
    productIds.length
      ? db.product.findMany({
          where: { companyId, id: { in: productIds } },
          select: { id: true, name: true, sku: true },
        })
      : Promise.resolve([]),
    customerIds.length
      ? db.customer.findMany({
          where: { companyId, id: { in: customerIds } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    supplierIds.length
      ? db.supplier.findMany({
          where: { companyId, id: { in: supplierIds } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
  ]);

  const productMap = new Map(products.map((p) => [p.id, p]));
  const customerMap = new Map(customers.map((c) => [c.id, c]));
  const supplierMap = new Map(suppliers.map((s) => [s.id, s]));

  return {
    generatedAt: new Date().toISOString(),
    range: {
      preset: range.preset,
      from: from.toISOString(),
      to: to.toISOString(),
    },
    granularity,
    summary: {
      revenue,
      expenses,
      profit: revenue - expenses,
      salesCount,
      purchasesCount,
      averageSale: salesCount > 0 ? revenue / salesCount : 0,
      averagePurchase: purchasesCount > 0 ? expenses / purchasesCount : 0,
    },
    chart,
    latestSales: sales.slice(0, 8).map((s) => ({
      id: s.id,
      invoiceNo: s.invoiceNo,
      total: num(s.total),
      customer: s.customer?.name || "—",
      date: s.saleDate.toISOString(),
    })),
    latestPurchases: purchases.slice(0, 8).map((p) => ({
      id: p.id,
      invoiceNo: p.invoiceNo,
      total: num(p.total),
      supplier: p.supplier?.name || "—",
      date: p.purchaseDate.toISOString(),
    })),
    topProducts: saleItems.map((g) => {
      const p = productMap.get(g.productId);
      return {
        id: g.productId,
        name: p?.name || "بەرهەم",
        sku: p?.sku || "—",
        quantity: num(g._sum.quantity),
        revenue: num(g._sum.total),
      };
    }),
    topCustomers: saleByCustomer.map((g) => {
      const c = customerMap.get(g.customerId);
      return {
        id: g.customerId,
        name: c?.name || "کڕیار",
        orders: g._count._all,
        revenue: num(g._sum.total),
      };
    }),
    topSuppliers: purchaseBySupplier.map((g) => {
      const s = supplierMap.get(g.supplierId);
      return {
        id: g.supplierId,
        name: s?.name || "دابینکەر",
        orders: g._count._all,
        spent: num(g._sum.total),
      };
    }),
  };
}
