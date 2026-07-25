"use client";
import { formatDate, formatTime } from "@/lib/utils/datetime";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Boxes,
  DollarSign,
  HeartPulse,
  Package,
  RefreshCw,
  ShoppingBasket,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Truck,
  Users,
  Warehouse,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AnalyticsPayload } from "@/lib/analytics/buildAnalytics";
import { formatMoney } from "@/lib/utils/format";
import { formatStockQty, STOCK_STATUS_LABELS_KU } from "@/lib/inventory/stock";
import StatCard from "@/components/dashboard/StatCard";
import ValuationMetricsGrid from "@/components/inventory/ValuationMetricsGrid";
import { toValuationMetrics } from "@/lib/inventory/valuationMetrics";
import { onNotificationsChanged } from "@/lib/notifications/bus";
import { appToast } from "@/lib/toast";
import { DS } from "@/lib/design-system";
import { LowStockWarningBanner } from "@/components/inventory/LowStockWarningBanner";
import AnalyticsStockBanners from "@/components/analytics/AnalyticsStockBanners";

const SALES = DS.color.chart.sales;
const PURCHASES = DS.color.chart.purchases;
const PROFIT = DS.color.chart.profit;
const PIE = [SALES, PURCHASES, PROFIT];

const HEALTH_LABELS = {
  HEALTHY: "تەندروست",
  ATTENTION: "پێویستی بە سەرنجدان",
  CRITICAL: "مەترسیدار",
} as const;

type Props = {
  initialData: AnalyticsPayload;
  companyName: string;
};

export default function AnalyticsClient({ initialData, companyName }: Props) {
  const [data, setData] = useState(initialData);
  const [pending, startTransition] = useTransition();
  const [auto, setAuto] = useState(true);
  const [pulse, setPulse] = useState<string | null>(null);
  const prevRef = useRef({
    salesCount: initialData.summary.salesCountThisMonth,
    purchasesCount: initialData.summary.purchasesCountThisMonth,
    lowStock: initialData.summary.lowStockCount,
    outOfStock: initialData.summary.outOfStockCount,
  });

  const showPulse = useCallback((message: string) => {
    setPulse(message);
    window.setTimeout(() => {
      setPulse((current) => (current === message ? null : current));
    }, 4500);
  }, []);

  const refresh = useCallback(async (silent = false) => {
    try {
      const res = await fetch("/api/analytics", { cache: "no-store" });
      const json = await res.json();
      if (!json.success) {
        if (!silent) appToast.error(json.message || "نوێکردنەوە سەرنەکەوت.");
        return;
      }
      const next = json.data as AnalyticsPayload;
      const prev = prevRef.current;

      if (silent) {
        if (next.summary.outOfStockCount > prev.outOfStock) {
          const item = next.outOfStock[0];
          showPulse(
            item
              ? `❌ ${item.name} · ${item.warehouseName || "کۆگا"} · ماوە ${formatStockQty(item.availableStock)}`
              : "❌ بەرهەم تەواو بوو"
          );
        } else if (next.summary.lowStockCount > prev.lowStock) {
          const item = next.lowStock[0];
          showPulse(
            item
              ? `⚠️ ${item.name} · ${item.warehouseName || "کۆگا"} · ماوە ${formatStockQty(item.availableStock)}`
              : "⚠️ کۆگای کەم"
          );
        } else if (next.summary.salesCountThisMonth > prev.salesCount) {
          showPulse("فرۆشتنی نوێ تۆمارکرا");
        } else if (
          next.summary.purchasesCountThisMonth > prev.purchasesCount
        ) {
          showPulse("کڕینی نوێ تۆمارکرا");
        }
      }

      prevRef.current = {
        salesCount: next.summary.salesCountThisMonth,
        purchasesCount: next.summary.purchasesCountThisMonth,
        lowStock: next.summary.lowStockCount,
        outOfStock: next.summary.outOfStockCount,
      };
      startTransition(() => setData(next));
    } catch {
      if (!silent) appToast.error("نوێکردنەوە سەرنەکەوت.");
    }
  }, [showPulse]);

  useEffect(() => {
    if (!auto) return;

    const tick = () => {
      if (document.visibilityState === "hidden") return;
      void refresh(true);
    };

    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [auto, refresh]);

  useEffect(() => {
    return onNotificationsChanged((detail) => {
      if (detail.reason === "scan" || detail.reason === "mutation") {
        void refresh(true);
      }
    });
  }, [refresh]);

  const { summary, inventoryHealth, salesPerformance, purchasePerformance } =
    data;

  const updatedLabel = `${formatDate(data.generatedAt)} ${formatTime(
    data.generatedAt
  )}`;

  const growthLabel = (pct: number | null) =>
    pct === null ? "—" : `${pct > 0 ? "+" : ""}${pct}%`;

  return (
    <div className="space-y-6 sm:space-y-8">
      {pulse ? (
        <div
          className="rounded-2xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm font-bold text-foreground shadow-sm animate-in fade-in"
          role="status"
        >
          {pulse}
        </div>
      ) : null}

      <AnalyticsStockBanners
        lowStock={data.lowStock}
        outOfStock={data.outOfStock}
      />

      <LowStockWarningBanner
        lowStockCount={summary.lowStockCount}
        outOfStockCount={summary.outOfStockCount}
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-black text-primary sm:text-4xl">
            شیکاری
          </h1>
          <p className="mt-2 text-muted-foreground">
            داتای ڕاستەقینە لە داتابەیس — {companyName}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            دوایین نوێکردنەوە: {updatedLabel}
            {auto ? " · خۆکار هەر ٣٠ چرکە" : " · تەنها دەستی"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={auto}
              onChange={(e) => setAuto(e.target.checked)}
              className="size-4"
            />
            نوێکردنەوەی خۆکار
          </label>
          <button
            type="button"
            disabled={pending}
            onClick={() => void refresh(false)}
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            <RefreshCw size={16} className={pending ? "animate-spin" : ""} />
            نوێکردنەوە
          </button>
          <Link
            href="/dashboard/reports"
            className="inline-flex h-11 items-center rounded-2xl border border-border bg-card px-4 text-sm font-bold text-primary"
          >
            ڕاپۆرتەکان
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="داهات (فرۆشتن)"
          value={`${formatMoney(summary.revenueTotal)} IQD`}
          description={`ئەم مانگە: ${formatMoney(summary.revenueThisMonth)} · ئەمڕۆ: ${formatMoney(summary.revenueToday)}`}
          icon={ShoppingCart}
          accent="sales"
        />
        <StatCard
          title="خەرجی (کڕین)"
          value={`${formatMoney(summary.expensesTotal)} IQD`}
          description={`ئەم مانگە: ${formatMoney(summary.expensesThisMonth)} · ئەمڕۆ: ${formatMoney(summary.expensesToday)}`}
          icon={ShoppingBasket}
          accent="purchases"
        />
        <StatCard
          title="قازانج"
          value={`${formatMoney(summary.profitTotal)} IQD`}
          description={`ئەم مانگە: ${formatMoney(summary.profitThisMonth)} · قازانجی کاڵا: ${formatMoney(summary.grossProfitThisMonth)}`}
          icon={TrendingUp}
          accent="sales"
        />
        <StatCard
          title="زەرەر"
          value={`${formatMoney(summary.lossTotal)} IQD`}
          description={`ئەم مانگە: ${formatMoney(summary.lossThisMonth)} · ئەمڕۆ: ${formatMoney(summary.lossToday)}`}
          icon={TrendingDown}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="تەندروستی کۆگا"
          value={`${inventoryHealth.score}%`}
          description={HEALTH_LABELS[inventoryHealth.label]}
          icon={HeartPulse}
        />
        <StatCard
          title="کۆگای کەم"
          value={summary.lowStockCount}
          description={`${summary.atMinimumCount} لە کەمترین بڕ`}
          icon={AlertTriangle}
        />
        <StatCard
          title="کۆگا تەواو"
          value={summary.outOfStockCount}
          description={`${formatStockQty(inventoryHealth.totalAvailable)} بەردەست`}
          icon={Package}
        />
        <StatCard
          title="کۆی یەکە"
          value={formatStockQty(summary.inventoryUnits)}
          description={`${summary.productsCount} بەرهەم · ${summary.warehousesCount} کۆگا`}
          icon={Warehouse}
        />
      </div>

      <ValuationMetricsGrid
        metrics={toValuationMetrics({
          inventoryValue: summary.inventoryValue,
          purchaseValue: summary.purchaseValue,
          salesValue: summary.salesValue,
          averageCost: summary.averageCost,
          currentAssetValue: summary.currentAssetValue,
          totalUnits: summary.inventoryUnits,
          productsCount: summary.productsCount,
        })}
        title="بەهاکانی ئینڤێنتۆری"
        subtitle="هەژمارکردنی خۆکار لە کۆگا × نرخ"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-primary" />
            <h2 className="text-lg font-bold text-primary sm:text-xl">
              کارایی فرۆشتن
            </h2>
          </div>
          <dl className="grid gap-3 sm:grid-cols-2">
            <PerfRow
              label="داهاتی ئەم مانگە"
              value={`${formatMoney(salesPerformance.revenueThisMonth)} IQD`}
            />
            <PerfRow
              label="گەشە vs مانگی پێشوو"
              value={growthLabel(salesPerformance.growthPct)}
            />
            <PerfRow
              label="ژمارەی فرۆشتن"
              value={String(salesPerformance.salesCountThisMonth)}
            />
            <PerfRow
              label="ناوەندی پسوولە"
              value={`${formatMoney(salesPerformance.avgOrderValueThisMonth)} IQD`}
            />
            <PerfRow
              label="قازانجی کاڵا"
              value={`${formatMoney(salesPerformance.grossProfitThisMonth)} IQD`}
            />
            <PerfRow
              label="داهاتی ئەمڕۆ"
              value={`${formatMoney(salesPerformance.revenueToday)} IQD`}
            />
          </dl>
        </div>

        <div className="rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <ShoppingBasket size={18} className="text-primary" />
            <h2 className="text-lg font-bold text-primary sm:text-xl">
              کارایی کڕین
            </h2>
          </div>
          <dl className="grid gap-3 sm:grid-cols-2">
            <PerfRow
              label="خەرجی ئەم مانگە"
              value={`${formatMoney(purchasePerformance.expensesThisMonth)} IQD`}
            />
            <PerfRow
              label="گەشە vs مانگی پێشوو"
              value={growthLabel(purchasePerformance.growthPct)}
            />
            <PerfRow
              label="ژمارەی کڕین"
              value={String(purchasePerformance.purchasesCountThisMonth)}
            />
            <PerfRow
              label="ناوەندی کڕین"
              value={`${formatMoney(purchasePerformance.avgPurchaseValueThisMonth)} IQD`}
            />
            <PerfRow
              label="کۆی خەرجی"
              value={`${formatMoney(purchasePerformance.expensesTotal)} IQD`}
            />
            <PerfRow
              label="خەرجی ئەمڕۆ"
              value={`${formatMoney(purchasePerformance.expensesToday)} IQD`}
            />
          </dl>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <ChartCard title="چارتی مانگانە (١٢ مانگ)" className="xl:col-span-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value) => `${formatMoney(Number(value ?? 0))} IQD`}
              />
              <Legend />
              <Bar
                dataKey="sales"
                name="فرۆشتن"
                fill={SALES}
                radius={[6, 6, 0, 0]}
              />
              <Bar
                dataKey="purchases"
                name="کڕین"
                fill={PURCHASES}
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="دابەشکردنی بەهای کۆگا">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={
                  data.warehouseDistribution.length
                    ? data.warehouseDistribution
                    : [{ name: "بەتاڵ", inventoryValue: 1 }]
                }
                dataKey="inventoryValue"
                nameKey="name"
                innerRadius={48}
                outerRadius={82}
                paddingAngle={3}
              >
                {(data.warehouseDistribution.length
                  ? data.warehouseDistribution
                  : [{ name: "بەتاڵ" }]
                ).map((_, i) => (
                  <Cell
                    key={i}
                    fill={
                      data.warehouseDistribution.length
                        ? PIE[i % PIE.length]
                        : "#94a3b8"
                    }
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value) =>
                  data.warehouseDistribution.length
                    ? `${formatMoney(Number(value ?? 0))} IQD`
                    : "هیچ داتایەک نییە"
                }
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="ڕەوتی بەهای ئینڤێنتۆری">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChartLike
              data={data.inventoryTrend}
              dataKey="inventoryValue"
              name="بەها"
              color={SALES}
              money
            />
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="ڕەوتی کۆگا (یەکە)">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChartLike
              data={data.stockTrend}
              dataKey="value"
              name="یەکە"
              color={PURCHASES}
            />
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="ڕەوتی فرۆشتن">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChartLike
              data={data.salesTrend}
              dataKey="value"
              name="فرۆشتن"
              color={SALES}
              money
            />
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="ڕەوتی کڕین">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChartLike
              data={data.purchaseTrend}
              dataKey="value"
              name="کڕین"
              color={PURCHASES}
              money
            />
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="ڕەوتی کۆگای کەم">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChartLike
              data={data.lowStockTrend}
              dataKey="value"
              name="کۆگای کەم"
              color="#dc2626"
            />
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="ڕەوتی تەندروستی ئینڤێنتۆری">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChartLike
              data={data.healthTrend}
              dataKey="value"
              name="تەندروستی %"
              color="#16a34a"
            />
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <ChartCard title="چارتی ساڵانە (٥ ساڵ)" className="xl:col-span-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.yearly}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value) => `${formatMoney(Number(value ?? 0))} IQD`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="sales"
                name="فرۆشتن"
                stroke={SALES}
                strokeWidth={3}
                dot
              />
              <Line
                type="monotone"
                dataKey="purchases"
                name="کڕین"
                stroke={PURCHASES}
                strokeWidth={3}
                dot
              />
              <Line
                type="monotone"
                dataKey="profit"
                name="قازانج/زەرەر"
                stroke={PROFIT}
                strokeWidth={2}
                dot
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <div className="rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <Warehouse size={18} className="text-primary" />
            <h2 className="text-lg font-bold text-primary sm:text-xl">
              دابەشکردنی کۆگا
            </h2>
          </div>
          {data.warehouseDistribution.length === 0 ? (
            <p className="text-sm text-muted-foreground">هیچ کۆگایەک نییە.</p>
          ) : (
            <div className="space-y-2">
              {data.warehouseDistribution.map((w) => (
                <Link
                  key={w.id}
                  href="/dashboard/werehouse"
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border px-3 py-2.5 transition hover:bg-muted"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">
                      {w.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatStockQty(w.units)} یەکە · تەندروستی {w.healthScore}%
                      {w.capacityPct != null ? ` · توانا ${w.capacityPct}%` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-primary">
                    {formatMoney(w.inventoryValue)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <RankCard
          title="باشترین فرۆشراو"
          icon={Package}
          empty="هیچ فرۆشتنێک نییە."
          rows={data.topProducts.map((p) => ({
            id: p.id,
            title: p.name,
            subtitle: p.sku,
            meta: `${formatMoney(p.quantity)} دانە`,
            value: `${formatMoney(p.revenue)} IQD`,
            href: `/dashboard/products/${p.id}`,
          }))}
        />
        <RankCard
          title="هێواش جووڵاو"
          icon={TrendingDown}
          empty="هیچ بەرهەمێکی هێواش نییە."
          rows={data.slowMovingProducts.map((p) => ({
            id: p.id,
            title: p.name,
            subtitle: p.sku,
            meta: `٩٠ ڕۆژ: ${formatMoney(p.quantity)}`,
            value: `${formatMoney(p.revenue)} IQD`,
            href: `/dashboard/products/${p.id}`,
          }))}
        />
        <div className="rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <HeartPulse size={18} className="text-primary" />
            <h2 className="text-lg font-bold text-primary sm:text-xl">
              تەندروستی ئینڤێنتۆری
            </h2>
          </div>
          <div className="mb-4">
            <p className="text-4xl font-black text-primary">
              {inventoryHealth.score}
              <span className="text-lg text-muted-foreground">/100</span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {HEALTH_LABELS[inventoryHealth.label]}
            </p>
          </div>
          <dl className="grid gap-2 sm:grid-cols-2">
            <PerfRow
              label="بەردەست"
              value={String(inventoryHealth.inStockCount)}
            />
            <PerfRow
              label="کۆگای کەم"
              value={String(inventoryHealth.lowStockCount)}
            />
            <PerfRow
              label="تەواو"
              value={String(inventoryHealth.outOfStockCount)}
            />
            <PerfRow
              label="کۆی یەکە"
              value={formatStockQty(inventoryHealth.totalCurrent)}
            />
          </dl>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <RankCard
          title="کۆگای کەم"
          icon={AlertTriangle}
          empty="هیچ بەرهەمێکی کەم نییە."
          rows={data.lowStock.map((p) => ({
            id: p.id,
            title: p.name,
            subtitle: p.sku,
            meta: `بەردەست ${formatStockQty(p.availableStock, p.unit)} · کەمترین ${formatStockQty(p.minimumStock, p.unit)}`,
            value: formatStockQty(p.currentStock, p.unit),
            href: `/dashboard/products/${p.id}`,
            danger: true,
          }))}
        />
        <RankCard
          title="کۆگا تەواو"
          icon={Boxes}
          empty="هیچ بەرهەمێکی تەواو نییە."
          rows={data.outOfStock.map((p) => ({
            id: p.id,
            title: p.name,
            subtitle: p.sku,
            meta: STOCK_STATUS_LABELS_KU[p.status],
            value: formatStockQty(p.currentStock, p.unit),
            href: `/dashboard/products/${p.id}`,
            danger: true,
          }))}
        />
        <RankCard
          title="باشترین کڕیارەکان"
          icon={Users}
          empty="هیچ کڕیارێک نییە."
          rows={data.bestCustomers.map((c) => ({
            id: c.id,
            title: c.name,
            subtitle: `${c.orders} پسوولە`,
            meta: "",
            value: `${formatMoney(c.revenue)} IQD`,
            href: `/dashboard/customers/${c.id}/edit`,
          }))}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <RankCard
          title="ئاگادارییەکانی کۆگا"
          icon={AlertTriangle}
          empty="هیچ ئاگادارییەکی کۆگا نییە."
          rows={data.inventoryAlerts.map((a) => ({
            id: a.id,
            title: a.title,
            subtitle: a.message,
            meta: a.timeAgo,
            value: a.kind || a.priority,
            href: a.href || "/dashboard/notifications",
            danger: a.priority === "CRITICAL" || a.priority === "HIGH",
          }))}
        />
        <div className="grid gap-6">
          <RankCard
            title="دوایین فرۆشتنەکان"
            icon={DollarSign}
            empty="هیچ فرۆشتنێک نییە."
            rows={data.recentSales.map((s) => ({
              id: s.id,
              title: s.invoiceNo,
              subtitle: s.customer,
              meta: formatDate(s.date),
              value: `${formatMoney(s.total)} IQD`,
              href: `/dashboard/sales/${s.id}`,
            }))}
          />
          <RankCard
            title="دوایین کڕینەکان"
            icon={Truck}
            empty="هیچ کڕینێک نییە."
            rows={data.recentPurchases.map((p) => ({
              id: p.id,
              title: p.invoiceNo,
              subtitle: p.supplier,
              meta: formatDate(p.date),
              value: `${formatMoney(p.total)} IQD`,
              href: `/dashboard/purchases/${p.id}`,
            }))}
          />
        </div>
      </div>
    </div>
  );
}

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  color: "var(--popover-foreground)",
};

function PerfRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-muted/30 px-3 py-2.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-bold text-foreground">{value}</dd>
    </div>
  );
}

function ChartCard({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`min-w-0 rounded-3xl border border-border bg-card p-3 shadow-sm sm:p-6 ${className}`}
    >
      <h2 className="mb-4 text-lg font-bold text-primary sm:text-xl">{title}</h2>
      <div className="rek-chart">{children}</div>
    </div>
  );
}

function AreaChartLike({
  data,
  dataKey,
  name,
  color,
  money = false,
}: {
  data: Array<Record<string, string | number>>;
  dataKey: string;
  name: string;
  color: string;
  money?: boolean;
}) {
  return (
    <AreaChart data={data}>
      <defs>
        <linearGradient id={`fill-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor={color} stopOpacity={0.35} />
          <stop offset="95%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
      <XAxis
        dataKey="name"
        tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
      />
      <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
      <Tooltip
        contentStyle={tooltipStyle}
        formatter={(value) =>
          money
            ? `${formatMoney(Number(value ?? 0))} IQD`
            : formatMoney(Number(value ?? 0))
        }
      />
      <Area
        type="monotone"
        dataKey={dataKey}
        name={name}
        stroke={color}
        fill={`url(#fill-${dataKey})`}
        strokeWidth={2}
      />
    </AreaChart>
  );
}

function RankCard({
  title,
  icon: Icon,
  rows,
  empty,
}: {
  title: string;
  icon: typeof Package;
  empty: string;
  rows: Array<{
    id: string;
    title: string;
    subtitle: string;
    meta: string;
    value: string;
    href: string;
    danger?: boolean;
  }>;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Icon size={18} className="text-primary" />
        <h2 className="text-lg font-bold text-primary sm:text-xl">{title}</h2>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <Link
              key={row.id}
              href={row.href}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border px-3 py-2.5 transition hover:bg-muted"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">
                  {row.title}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {row.subtitle}
                  {row.meta ? ` · ${row.meta}` : ""}
                </p>
              </div>
              <p
                className={`shrink-0 text-sm font-bold ${
                  row.danger ? "text-destructive" : "text-primary"
                }`}
              >
                {row.value}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
