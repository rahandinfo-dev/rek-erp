import { db } from "@/lib/prisma/db";
import {
  getAvailableStock,
  getStockStatus,
  type StockStatus,
} from "@/lib/inventory/stock";
import { timeAgoKu } from "@/lib/notifications/create";
import {
  buildInventoryValuation,
  buildAllWarehouseValuations,
} from "@/lib/inventory/valuation";
import {
  buildInventoryTrendSeries,
  salesPurchaseTrend,
  toSimpleTrend,
  toWarehouseDistribution,
} from "@/lib/analytics/inventorySeries";

export type ChartPoint = {
  name: string;
  sales: number;
  purchases: number;
  profit: number;
};

export type RankedProduct = {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  revenue: number;
};

export type RankedCustomer = {
  id: string;
  name: string;
  orders: number;
  revenue: number;
};

export type RankedSupplier = {
  id: string;
  name: string;
  orders: number;
  spent: number;
};

export type WarehouseStat = {
  id: string;
  name: string;
  isMain: boolean;
  sales: number;
  purchases: number;
  /** Company inventory health mirrored onto main warehouse; activity signal for others. */
  status: "HEALTHY" | "ATTENTION" | "CRITICAL";
};

export type StockAlertItem = {
  id: string;
  name: string;
  sku: string;
  currentStock: number;
  availableStock: number;
  reservedStock: number;
  minimumStock: number;
  unit: string;
  status: StockStatus;
  warehouseName: string | null;
};

export type RecentSale = {
  id: string;
  invoiceNo: string;
  total: number;
  customer: string;
  date: string;
};

export type RecentPurchase = {
  id: string;
  invoiceNo: string;
  total: number;
  supplier: string;
  date: string;
};

export type InventoryHealth = {
  score: number;
  label: "HEALTHY" | "ATTENTION" | "CRITICAL";
  productsCount: number;
  inStockCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  atMinimumCount: number;
  totalCurrent: number;
  totalAvailable: number;
  totalReserved: number;
};

export type SalesPerformance = {
  revenueTotal: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  revenueToday: number;
  salesCountTotal: number;
  salesCountThisMonth: number;
  avgOrderValueThisMonth: number;
  growthPct: number | null;
  grossProfitThisMonth: number;
};

export type PurchasePerformance = {
  expensesTotal: number;
  expensesThisMonth: number;
  expensesLastMonth: number;
  expensesToday: number;
  purchasesCountTotal: number;
  purchasesCountThisMonth: number;
  avgPurchaseValueThisMonth: number;
  growthPct: number | null;
};

export type InventoryNotificationItem = {
  id: string;
  title: string;
  message: string;
  category: string;
  priority: string;
  href: string | null;
  timeAgo: string;
  date: string;
  kind: string | null;
};

export type AnalyticsSummary = {
  revenueTotal: number;
  revenueThisMonth: number;
  revenueToday: number;
  expensesTotal: number;
  expensesThisMonth: number;
  expensesToday: number;
  profitTotal: number;
  profitThisMonth: number;
  profitToday: number;
  lossTotal: number;
  lossThisMonth: number;
  lossToday: number;
  grossProfitThisMonth: number;
  salesCountTotal: number;
  salesCountThisMonth: number;
  purchasesCountTotal: number;
  purchasesCountThisMonth: number;
  productsCount: number;
  customersCount: number;
  suppliersCount: number;
  warehousesCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  atMinimumCount: number;
  inventoryHealthScore: number;
  inventoryValue: number;
  inventoryUnits: number;
  warehouseValue: number;
  purchaseValue: number;
  salesValue: number;
  currentAssetValue: number;
  averageCost: number;
};

export type AnalyticsPayload = {
  generatedAt: string;
  summary: AnalyticsSummary;
  monthly: ChartPoint[];
  yearly: ChartPoint[];
  salesTrend: Array<{ name: string; value: number }>;
  purchaseTrend: Array<{ name: string; value: number }>;
  inventoryTrend: Array<{
    name: string;
    inventoryValue: number;
    stockUnits: number;
    lowStockCount: number;
    outOfStockCount: number;
    healthScore: number;
  }>;
  stockTrend: Array<{ name: string; value: number }>;
  lowStockTrend: Array<{ name: string; value: number }>;
  healthTrend: Array<{ name: string; value: number }>;
  warehouseDistribution: Array<{
    id: string;
    name: string;
    inventoryValue: number;
    units: number;
    availableUnits: number;
    capacityPct: number | null;
    healthScore: number;
  }>;
  topProducts: RankedProduct[];
  slowMovingProducts: RankedProduct[];
  bestCustomers: RankedCustomer[];
  topSuppliers: RankedSupplier[];
  warehouseStats: WarehouseStat[];
  lowStock: StockAlertItem[];
  outOfStock: StockAlertItem[];
  atMinimum: StockAlertItem[];
  inventoryHealth: InventoryHealth;
  salesPerformance: SalesPerformance;
  purchasePerformance: PurchasePerformance;
  inventoryAlerts: InventoryNotificationItem[];
  recentSales: RecentSale[];
  recentPurchases: RecentPurchase[];
};

function num(value: unknown) {
  return Number(value ?? 0);
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(d: Date) {
  return `${d.getMonth() + 1}/${d.getFullYear()}`;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function growthPct(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function bucketSeries(
  months: Date[],
  sales: Array<{ date: Date; total: number }>,
  purchases: Array<{ date: Date; total: number }>
): ChartPoint[] {
  return months.map((m) => {
    const key = monthKey(m);
    const salesSum = sales
      .filter((s) => monthKey(s.date) === key)
      .reduce((acc, s) => acc + s.total, 0);
    const purchasesSum = purchases
      .filter((p) => monthKey(p.date) === key)
      .reduce((acc, p) => acc + p.total, 0);
    return {
      name: monthLabel(m),
      sales: salesSum,
      purchases: purchasesSum,
      profit: salesSum - purchasesSum,
    };
  });
}

function profitLoss(net: number) {
  return {
    profit: Math.max(0, net),
    loss: Math.max(0, -net),
  };
}

function healthLabel(score: number): InventoryHealth["label"] {
  if (score >= 80) return "HEALTHY";
  if (score >= 50) return "ATTENTION";
  return "CRITICAL";
}

function computeInventoryHealth(
  products: Array<{
    currentStock: unknown;
    reservedStock: unknown;
    minimumStock: unknown;
  }>
): InventoryHealth {
  let inStockCount = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  let atMinimumCount = 0;
  let totalCurrent = 0;
  let totalAvailable = 0;
  let totalReserved = 0;

  for (const p of products) {
    const current = num(p.currentStock);
    const reserved = num(p.reservedStock);
    const minimum = num(p.minimumStock);
    const available = getAvailableStock(current, reserved);
    const status = getStockStatus(current, minimum);

    totalCurrent += current;
    totalAvailable += available;
    totalReserved += reserved;

    if (status === "OUT_OF_STOCK") outOfStockCount += 1;
    else if (status === "LOW_STOCK") lowStockCount += 1;
    else inStockCount += 1;

    if (minimum > 0 && current === minimum) atMinimumCount += 1;
  }

  const productsCount = products.length;
  const outRatio = productsCount > 0 ? outOfStockCount / productsCount : 0;
  const lowRatio = productsCount > 0 ? lowStockCount / productsCount : 0;
  const score = Math.max(
    0,
    Math.min(100, Math.round(100 - outRatio * 55 - lowRatio * 35))
  );

  return {
    score,
    label: healthLabel(score),
    productsCount,
    inStockCount,
    lowStockCount,
    outOfStockCount,
    atMinimumCount,
    totalCurrent,
    totalAvailable,
    totalReserved,
  };
}

function toStockAlertItem(
  p: {
    id: string;
    name: string;
    sku: string;
    currentStock: unknown;
    reservedStock: unknown;
    minimumStock: unknown;
    unit?: { name: string; symbol: string | null } | null;
  },
  status: StockStatus,
  warehouseName: string | null = null
): StockAlertItem {
  const current = num(p.currentStock);
  const reserved = num(p.reservedStock);
  return {
    id: p.id,
    name: p.name,
    sku: p.sku,
    currentStock: current,
    availableStock: getAvailableStock(current, reserved),
    reservedStock: reserved,
    minimumStock: num(p.minimumStock),
    unit: p.unit?.symbol || p.unit?.name || "",
    status,
    warehouseName,
  };
}

export async function buildAnalytics(companyId: string): Promise<AnalyticsPayload> {
  const now = new Date();
  const today = startOfDay(now);
  const monthStart = startOfMonth(now);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = monthStart;
  const months12 = Array.from({ length: 12 }, (_, i) =>
    new Date(now.getFullYear(), now.getMonth() - (11 - i), 1)
  );
  const rangeStart = months12[0]!;
  const yearStart = new Date(now.getFullYear() - 4, 0, 1);
  const slowWindowStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const [
    salesTotalAgg,
    salesMonthAgg,
    salesTodayAgg,
    salesLastMonthAgg,
    purchasesTotalAgg,
    purchasesMonthAgg,
    purchasesTodayAgg,
    purchasesLastMonthAgg,
    productsCount,
    customersCount,
    suppliersCount,
    warehousesCount,
    productStocks,
    topProductGroups,
    soldQtyGroups,
    bestCustomerGroups,
    topSupplierGroups,
    salesByWarehouse,
    purchasesByWarehouse,
    warehouses,
    salesForYears,
    purchasesForYears,
    monthSaleItems,
    recentSales,
    recentPurchases,
    inventoryNotifications,
    inventoryValuation,
    warehouseValuations,
    stockMovements,
  ] = await Promise.all([
    db.sale.aggregate({
      where: { companyId, status: "COMPLETED" },
      _sum: { total: true },
      _count: true,
    }),
    db.sale.aggregate({
      where: {
        companyId,
        status: "COMPLETED",
        saleDate: { gte: monthStart },
      },
      _sum: { total: true },
      _count: true,
    }),
    db.sale.aggregate({
      where: {
        companyId,
        status: "COMPLETED",
        saleDate: { gte: today },
      },
      _sum: { total: true },
    }),
    db.sale.aggregate({
      where: {
        companyId,
        status: "COMPLETED",
        saleDate: { gte: lastMonthStart, lt: lastMonthEnd },
      },
      _sum: { total: true },
    }),
    db.purchase.aggregate({
      where: { companyId, status: "COMPLETED" },
      _sum: { total: true },
      _count: true,
    }),
    db.purchase.aggregate({
      where: {
        companyId,
        status: "COMPLETED",
        purchaseDate: { gte: monthStart },
      },
      _sum: { total: true },
      _count: true,
    }),
    db.purchase.aggregate({
      where: {
        companyId,
        status: "COMPLETED",
        purchaseDate: { gte: today },
      },
      _sum: { total: true },
    }),
    db.purchase.aggregate({
      where: {
        companyId,
        status: "COMPLETED",
        purchaseDate: { gte: lastMonthStart, lt: lastMonthEnd },
      },
      _sum: { total: true },
    }),
    db.product.count({ where: { companyId, deletedAt: null } }),
    db.customer.count({ where: { companyId, deletedAt: null } }),
    db.supplier.count({ where: { companyId, deletedAt: null } }),
    db.warehouse.count({ where: { companyId, deletedAt: null } }),
    db.product.findMany({
      where: { companyId, active: true, deletedAt: null },
      select: {
        id: true,
        name: true,
        sku: true,
        currentStock: true,
        reservedStock: true,
        minimumStock: true,
        costPrice: true,
        purchasePrice: true,
        unit: { select: { name: true, symbol: true } },
      },
      orderBy: { name: "asc" },
    }),
    db.saleItem.groupBy({
      by: ["productId"],
      where: { sale: { companyId, status: "COMPLETED" } },
      _sum: { total: true, quantity: true },
      orderBy: { _sum: { total: "desc" } },
      take: 8,
    }),
    db.saleItem.groupBy({
      by: ["productId"],
      where: {
        sale: {
          companyId,
          status: "COMPLETED",
          saleDate: { gte: slowWindowStart },
        },
      },
      _sum: { total: true, quantity: true },
    }),
    db.sale.groupBy({
      by: ["customerId"],
      where: { companyId, status: "COMPLETED" },
      _sum: { total: true },
      _count: { _all: true },
      orderBy: { _sum: { total: "desc" } },
      take: 8,
    }),
    db.purchase.groupBy({
      by: ["supplierId"],
      where: { companyId, status: "COMPLETED" },
      _sum: { total: true },
      _count: { _all: true },
      orderBy: { _sum: { total: "desc" } },
      take: 8,
    }),
    db.sale.groupBy({
      by: ["warehouseId"],
      where: { companyId, status: "COMPLETED" },
      _sum: { total: true },
    }),
    db.purchase.groupBy({
      by: ["warehouseId"],
      where: { companyId, status: "COMPLETED" },
      _sum: { total: true },
    }),
    db.warehouse.findMany({
      where: { companyId, deletedAt: null },
      select: { id: true, name: true, isMain: true },
      orderBy: [{ isMain: "desc" }, { name: "asc" }],
    }),
    db.sale.findMany({
      where: {
        companyId,
        status: "COMPLETED",
        saleDate: { gte: yearStart },
      },
      select: { saleDate: true, total: true },
    }),
    db.purchase.findMany({
      where: {
        companyId,
        status: "COMPLETED",
        purchaseDate: { gte: yearStart },
      },
      select: { purchaseDate: true, total: true },
    }),
    db.saleItem.findMany({
      where: {
        sale: {
          companyId,
          status: "COMPLETED",
          saleDate: { gte: monthStart },
        },
      },
      select: {
        quantity: true,
        total: true,
        product: { select: { costPrice: true, purchasePrice: true } },
      },
    }),
    db.sale.findMany({
      where: { companyId, status: "COMPLETED" },
      include: { customer: { select: { name: true } } },
      orderBy: { saleDate: "desc" },
      take: 8,
    }),
    db.purchase.findMany({
      where: { companyId, status: "COMPLETED" },
      include: { supplier: { select: { name: true } } },
      orderBy: { purchaseDate: "desc" },
      take: 8,
    }),
    db.notification.findMany({
      where: {
        companyId,
        deletedAt: null,
        OR: [
          { category: { in: ["INVENTORY", "WAREHOUSE", "WARNING"] } },
          {
            metadata: {
              path: ["kind"],
              equals: "OUT_OF_STOCK",
            },
          },
          {
            metadata: {
              path: ["kind"],
              equals: "LOW_STOCK",
            },
          },
          {
            metadata: {
              path: ["kind"],
              equals: "AT_MINIMUM",
            },
          },
          {
            metadata: {
              path: ["kind"],
              equals: "WAREHOUSE_LOW",
            },
          },
          {
            metadata: {
              path: ["kind"],
              equals: "WAREHOUSE_CAPACITY",
            },
          },
          {
            metadata: {
              path: ["kind"],
              equals: "INVENTORY_ADJUSTMENT",
            },
          },
          {
            metadata: {
              path: ["kind"],
              equals: "WAREHOUSE_TRANSFER",
            },
          },
          {
            metadata: {
              path: ["kind"],
              equals: "LARGE_SALE",
            },
          },
          {
            metadata: {
              path: ["kind"],
              equals: "LARGE_PURCHASE",
            },
          },
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
        href: true,
        createdAt: true,
        metadata: true,
      },
    }),
    buildInventoryValuation(companyId),
    buildAllWarehouseValuations(companyId),
    db.inventoryTransaction.findMany({
      where: {
        companyId,
        createdAt: { gte: rangeStart },
      },
      select: {
        productId: true,
        type: true,
        quantity: true,
        previousQty: true,
        newQty: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20000,
    }),
  ]);

  const revenueTotal = num(salesTotalAgg._sum.total);
  const revenueThisMonth = num(salesMonthAgg._sum.total);
  const revenueToday = num(salesTodayAgg._sum.total);
  const revenueLastMonth = num(salesLastMonthAgg._sum.total);
  const expensesTotal = num(purchasesTotalAgg._sum.total);
  const expensesThisMonth = num(purchasesMonthAgg._sum.total);
  const expensesToday = num(purchasesTodayAgg._sum.total);
  const expensesLastMonth = num(purchasesLastMonthAgg._sum.total);

  const totalPL = profitLoss(revenueTotal - expensesTotal);
  const monthPL = profitLoss(revenueThisMonth - expensesThisMonth);
  const todayPL = profitLoss(revenueToday - expensesToday);

  const grossProfitThisMonth = monthSaleItems.reduce((acc, item) => {
    const unitCost =
      num(item.product.costPrice) || num(item.product.purchasePrice);
    return acc + (num(item.total) - num(item.quantity) * unitCost);
  }, 0);

  const inventoryHealth = computeInventoryHealth(productStocks);

  const lowStock: StockAlertItem[] = [];
  const outOfStock: StockAlertItem[] = [];
  const atMinimum: StockAlertItem[] = [];

  for (const p of productStocks) {
    const current = num(p.currentStock);
    const minimum = num(p.minimumStock);
    const status = getStockStatus(current, minimum);
    if (status === "OUT_OF_STOCK") {
      outOfStock.push(toStockAlertItem(p, status));
    } else if (status === "LOW_STOCK") {
      lowStock.push(toStockAlertItem(p, status));
    }
    if (minimum > 0 && current === minimum) {
      atMinimum.push(toStockAlertItem(p, status));
    }
  }

  lowStock.sort((a, b) => a.currentStock - b.currentStock);
  outOfStock.sort((a, b) => a.currentStock - b.currentStock);

  const alertProductIds = [
    ...new Set([
      ...lowStock.map((i) => i.id),
      ...outOfStock.map((i) => i.id),
      ...atMinimum.map((i) => i.id),
    ]),
  ];

  if (alertProductIds.length > 0) {
    const stockRows = await db.warehouseStock.findMany({
      where: {
        companyId,
        productId: { in: alertProductIds },
      },
      select: {
        productId: true,
        quantity: true,
        warehouse: { select: { name: true, isMain: true } },
      },
      orderBy: { quantity: "asc" },
    });
    const warehouseByProduct = new Map<string, string>();
    for (const row of stockRows) {
      if (warehouseByProduct.has(row.productId)) continue;
      warehouseByProduct.set(row.productId, row.warehouse.name);
    }
    const applyWh = (items: StockAlertItem[]) => {
      for (const item of items) {
        item.warehouseName = warehouseByProduct.get(item.id) ?? null;
      }
    };
    applyWh(lowStock);
    applyWh(outOfStock);
    applyWh(atMinimum);
  }

  const soldMap = new Map(
    soldQtyGroups.map((g) => [
      g.productId,
      { quantity: num(g._sum.quantity), revenue: num(g._sum.total) },
    ])
  );

  const topSellerIds = new Set(topProductGroups.map((g) => g.productId));
  const slowCandidates = productStocks
    .map((p) => {
      const sold = soldMap.get(p.id) || { quantity: 0, revenue: 0 };
      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        quantity: sold.quantity,
        revenue: sold.revenue,
      };
    })
    .filter((p) => !topSellerIds.has(p.id) || p.quantity === 0)
    .sort((a, b) => a.quantity - b.quantity || a.revenue - b.revenue)
    .slice(0, 8);

  const productIds = [
    ...new Set([
      ...topProductGroups.map((g) => g.productId),
      ...slowCandidates.map((p) => p.id),
    ]),
  ];
  const customerIds = bestCustomerGroups.map((g) => g.customerId);
  const supplierIds = topSupplierGroups.map((g) => g.supplierId);

  const [productRows, customerRows, supplierRows] = await Promise.all([
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

  const productMap = new Map(productRows.map((p) => [p.id, p]));
  const customerMap = new Map(customerRows.map((c) => [c.id, c]));
  const supplierMap = new Map(supplierRows.map((s) => [s.id, s]));

  const topProducts: RankedProduct[] = topProductGroups.map((g) => {
    const p = productMap.get(g.productId);
    return {
      id: g.productId,
      name: p?.name || "بەرهەم",
      sku: p?.sku || "—",
      quantity: num(g._sum.quantity),
      revenue: num(g._sum.total),
    };
  });

  const slowMovingProducts: RankedProduct[] = slowCandidates.map((p) => {
    const row = productMap.get(p.id);
    return {
      id: p.id,
      name: row?.name || p.name,
      sku: row?.sku || p.sku,
      quantity: p.quantity,
      revenue: p.revenue,
    };
  });

  const bestCustomers: RankedCustomer[] = bestCustomerGroups.map((g) => {
    const c = customerMap.get(g.customerId);
    return {
      id: g.customerId,
      name: c?.name || "کڕیار",
      orders: g._count._all,
      revenue: num(g._sum.total),
    };
  });

  const topSuppliers: RankedSupplier[] = topSupplierGroups.map((g) => {
    const s = supplierMap.get(g.supplierId);
    return {
      id: g.supplierId,
      name: s?.name || "دابینکەر",
      orders: g._count._all,
      spent: num(g._sum.total),
    };
  });

  const salesWhMap = new Map(
    salesByWarehouse.map((g) => [g.warehouseId, num(g._sum.total)])
  );
  const purchasesWhMap = new Map(
    purchasesByWarehouse.map((g) => [g.warehouseId, num(g._sum.total)])
  );

  const warehouseStats: WarehouseStat[] = warehouses.map((w) => {
    const sales = salesWhMap.get(w.id) || 0;
    const purchases = purchasesWhMap.get(w.id) || 0;
    let status: WarehouseStat["status"] = "HEALTHY";

    if (w.isMain) {
      status =
        inventoryHealth.label === "CRITICAL"
          ? "CRITICAL"
          : inventoryHealth.label === "ATTENTION"
            ? "ATTENTION"
            : "HEALTHY";
    } else if (sales > 0 && purchases === 0 && inventoryHealth.lowStockCount > 0) {
      status = "ATTENTION";
    } else if (sales > purchases * 1.5 && inventoryHealth.outOfStockCount > 0) {
      status = "CRITICAL";
    }

    return {
      id: w.id,
      name: w.name,
      isMain: w.isMain,
      sales,
      purchases,
      status,
    };
  });

  const monthly = bucketSeries(
    months12,
    salesForYears
      .filter((s) => s.saleDate >= rangeStart)
      .map((s) => ({ date: s.saleDate, total: num(s.total) })),
    purchasesForYears
      .filter((p) => p.purchaseDate >= rangeStart)
      .map((p) => ({
        date: p.purchaseDate,
        total: num(p.total),
      }))
  );

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 4 + i);
  const yearly: ChartPoint[] = years.map((year) => {
    const salesSum = salesForYears
      .filter((s) => s.saleDate.getFullYear() === year)
      .reduce((acc, s) => acc + num(s.total), 0);
    const purchasesSum = purchasesForYears
      .filter((p) => p.purchaseDate.getFullYear() === year)
      .reduce((acc, p) => acc + num(p.total), 0);
    return {
      name: String(year),
      sales: salesSum,
      purchases: purchasesSum,
      profit: salesSum - purchasesSum,
    };
  });

  const salesCountThisMonth = salesMonthAgg._count;
  const purchasesCountThisMonth = purchasesMonthAgg._count;

  const salesPerformance: SalesPerformance = {
    revenueTotal,
    revenueThisMonth,
    revenueLastMonth,
    revenueToday,
    salesCountTotal: salesTotalAgg._count,
    salesCountThisMonth,
    avgOrderValueThisMonth:
      salesCountThisMonth > 0 ? revenueThisMonth / salesCountThisMonth : 0,
    growthPct: growthPct(revenueThisMonth, revenueLastMonth),
    grossProfitThisMonth,
  };

  const purchasePerformance: PurchasePerformance = {
    expensesTotal,
    expensesThisMonth,
    expensesLastMonth,
    expensesToday,
    purchasesCountTotal: purchasesTotalAgg._count,
    purchasesCountThisMonth,
    avgPurchaseValueThisMonth:
      purchasesCountThisMonth > 0
        ? expensesThisMonth / purchasesCountThisMonth
        : 0,
    growthPct: growthPct(expensesThisMonth, expensesLastMonth),
  };

  const inventoryAlerts: InventoryNotificationItem[] =
    inventoryNotifications.map((n) => {
      const meta =
        n.metadata && typeof n.metadata === "object" && !Array.isArray(n.metadata)
          ? (n.metadata as Record<string, unknown>)
          : null;
      return {
        id: n.id,
        title: n.title,
        message: n.message,
        category: n.category,
        priority: n.priority,
        href: n.href,
        timeAgo: timeAgoKu(n.createdAt),
        date: n.createdAt.toISOString(),
        kind: typeof meta?.kind === "string" ? meta.kind : null,
      };
    });

  const inventoryTrend = buildInventoryTrendSeries({
    months: months12,
    products: productStocks,
    transactions: stockMovements,
  });
  const { salesTrend, purchaseTrend } = salesPurchaseTrend(monthly);
  const stockTrend = toSimpleTrend(inventoryTrend, "stockUnits");
  const lowStockTrend = toSimpleTrend(inventoryTrend, "lowStockCount");
  const healthTrend = toSimpleTrend(inventoryTrend, "healthScore");
  const warehouseDistribution = toWarehouseDistribution(warehouseValuations);

  return {
    generatedAt: now.toISOString(),
    summary: {
      revenueTotal,
      revenueThisMonth,
      revenueToday,
      expensesTotal,
      expensesThisMonth,
      expensesToday,
      profitTotal: totalPL.profit,
      profitThisMonth: monthPL.profit,
      profitToday: todayPL.profit,
      lossTotal: totalPL.loss,
      lossThisMonth: monthPL.loss,
      lossToday: todayPL.loss,
      grossProfitThisMonth,
      salesCountTotal: salesTotalAgg._count,
      salesCountThisMonth,
      purchasesCountTotal: purchasesTotalAgg._count,
      purchasesCountThisMonth,
      productsCount,
      customersCount,
      suppliersCount,
      warehousesCount,
      lowStockCount: inventoryHealth.lowStockCount,
      outOfStockCount: inventoryHealth.outOfStockCount,
      atMinimumCount: inventoryHealth.atMinimumCount,
      inventoryHealthScore: inventoryHealth.score,
      inventoryValue: inventoryValuation.inventoryValue,
      inventoryUnits: inventoryValuation.totalUnits,
      warehouseValue: inventoryValuation.inventoryValue,
      purchaseValue: inventoryValuation.purchaseValue,
      salesValue: inventoryValuation.salesValue,
      currentAssetValue: inventoryValuation.currentAssetValue,
      averageCost: inventoryValuation.averageCost,
    },
    monthly,
    yearly,
    salesTrend,
    purchaseTrend,
    inventoryTrend,
    stockTrend,
    lowStockTrend,
    healthTrend,
    warehouseDistribution,
    topProducts,
    slowMovingProducts,
    bestCustomers,
    topSuppliers,
    warehouseStats,
    lowStock: lowStock.slice(0, 10),
    outOfStock: outOfStock.slice(0, 10),
    atMinimum: atMinimum.slice(0, 10),
    inventoryHealth,
    salesPerformance,
    purchasePerformance,
    inventoryAlerts,
    recentSales: recentSales.map((s) => ({
      id: s.id,
      invoiceNo: s.invoiceNo,
      total: num(s.total),
      customer: s.customer.name,
      date: s.saleDate.toISOString(),
    })),
    recentPurchases: recentPurchases.map((p) => ({
      id: p.id,
      invoiceNo: p.invoiceNo,
      total: num(p.total),
      supplier: p.supplier.name,
      date: p.purchaseDate.toISOString(),
    })),
  };
}

/** Lightweight chart series for the home dashboard (last 6 months). */
export async function buildDashboardChartData(companyId: string) {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) =>
    new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
  );
  const rangeStart = months[0]!;

  const [sales, purchases, lowStockProducts, topProducts] = await Promise.all([
    db.sale.findMany({
      where: {
        companyId,
        status: "COMPLETED",
        saleDate: { gte: rangeStart },
      },
      select: { saleDate: true, total: true },
    }),
    db.purchase.findMany({
      where: {
        companyId,
        status: "COMPLETED",
        purchaseDate: { gte: rangeStart },
      },
      select: { purchaseDate: true, total: true },
    }),
    db.product.findMany({
      where: { companyId, active: true },
      select: {
        id: true,
        name: true,
        sku: true,
        currentStock: true,
        reservedStock: true,
        minimumStock: true,
      },
      take: 500,
    }),
    db.saleItem.groupBy({
      by: ["productId"],
      where: {
        sale: {
          companyId,
          status: "COMPLETED",
          saleDate: { gte: rangeStart },
        },
      },
      _sum: { total: true, quantity: true },
      orderBy: { _sum: { total: "desc" } },
      take: 5,
    }),
  ]);

  const monthly = bucketSeries(
    months,
    sales.map((s) => ({ date: s.saleDate, total: num(s.total) })),
    purchases.map((p) => ({ date: p.purchaseDate, total: num(p.total) }))
  );

  const health = computeInventoryHealth(lowStockProducts);

  const productIds = topProducts.map((g) => g.productId);
  const productRows = productIds.length
    ? await db.product.findMany({
        where: { id: { in: productIds }, companyId },
        select: { id: true, name: true },
      })
    : [];
  const map = new Map(productRows.map((p) => [p.id, p.name]));

  return {
    monthly,
    topProducts: topProducts.map((g) => ({
      name: map.get(g.productId) || "بەرهەم",
      revenue: num(g._sum.total),
      quantity: num(g._sum.quantity),
    })),
    lowStockCount: health.lowStockCount,
    outOfStockCount: health.outOfStockCount,
    inventoryHealthScore: health.score,
  };
}
