"use client";
import { formatDate, formatTime } from "@/lib/utils/datetime";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Boxes,
  DollarSign,
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
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AnalyticsPayload } from "@/lib/analytics/buildAnalytics";
import { formatMoney } from "@/lib/utils/format";
import { formatStockQty, STOCK_STATUS_LABELS_KU } from "@/lib/inventory/stock";
import StatCard from "@/components/dashboard/StatCard";
import { onNotificationsChanged } from "@/lib/notifications/bus";
import { appToast } from "@/lib/toast";
import { DS } from "@/lib/design-system";
import { LowStockWarningBanner } from "@/components/inventory/LowStockWarningBanner";
import AnalyticsStockBanners from "@/components/analytics/AnalyticsStockBanners";
import { useT } from "@/components/i18n/LocaleProvider";

const SALES = DS.color.chart.sales;
const PURCHASES = DS.color.chart.purchases;
const PROFIT = DS.color.chart.profit;

type Props = {
  initialData: AnalyticsPayload;
  companyName: string;
};

export default function AnalyticsClient({ initialData, companyName }: Props) {
  const { t } = useT();
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
        if (!silent) appToast.error(json.message || t("analytics.refreshFailed"));
        return;
      }
      const next = json.data as AnalyticsPayload;
      const prev = prevRef.current;

      if (silent) {
        if (next.summary.outOfStockCount > prev.outOfStock) {
          const item = next.outOfStock[0];
          showPulse(
            item
              ? `❌ ${t("analytics.stockPulse", {
                  name: item.name,
                  warehouse:
                    item.warehouseName || t("analytics.warehouseFallback"),
                  qty: formatStockQty(item.availableStock),
                })}`
              : `❌ ${t("analytics.productOut")}`
          );
        } else if (next.summary.lowStockCount > prev.lowStock) {
          const item = next.lowStock[0];
          showPulse(
            item
              ? `⚠️ ${t("analytics.stockPulse", {
                  name: item.name,
                  warehouse:
                    item.warehouseName || t("analytics.warehouseFallback"),
                  qty: formatStockQty(item.availableStock),
                })}`
              : `⚠️ ${t("analytics.lowStockPulse")}`
          );
        } else if (next.summary.salesCountThisMonth > prev.salesCount) {
          showPulse(t("analytics.newSale"));
        } else if (
          next.summary.purchasesCountThisMonth > prev.purchasesCount
        ) {
          showPulse(t("analytics.newPurchase"));
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
      if (!silent) appToast.error(t("analytics.refreshFailed"));
    }
  }, [showPulse, t]);

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

  const { summary, salesPerformance, purchasePerformance } = data;

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
            {t("analytics.title")}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {t("analytics.subtitle", { name: companyName })}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("analytics.lastUpdated", { when: updatedLabel })}
            {auto ? t("analytics.autoEvery30") : t("analytics.manualOnly")}
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
            {t("analytics.autoRefresh")}
          </label>
          <button
            type="button"
            disabled={pending}
            onClick={() => void refresh(false)}
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            <RefreshCw size={16} className={pending ? "animate-spin" : ""} />
            {t("common.refresh")}
          </button>
          <Link
            href="/dashboard/reports"
            className="inline-flex h-11 items-center rounded-2xl border border-border bg-card px-4 text-sm font-bold text-primary"
          >
            {t("nav.reports")}
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title={t("analytics.revenue")}
          value={`${formatMoney(summary.revenueTotal)}`}
          description={t("analytics.thisMonthToday", { month: formatMoney(summary.revenueThisMonth), today: formatMoney(summary.revenueToday) })}
          icon={ShoppingCart}
          accent="sales"
        />
        <StatCard
          title={t("analytics.expenses")}
          value={`${formatMoney(summary.expensesTotal)}`}
          description={t("analytics.thisMonthToday", { month: formatMoney(summary.expensesThisMonth), today: formatMoney(summary.expensesToday) })}
          icon={ShoppingBasket}
          accent="purchases"
        />
        <StatCard
          title={t("analytics.profit")}
          value={`${formatMoney(summary.profitTotal)}`}
          description={t("analytics.profitDesc", { month: formatMoney(summary.profitThisMonth), gross: formatMoney(summary.grossProfitThisMonth) })}
          icon={TrendingUp}
          accent="sales"
        />
        <StatCard
          title={t("analytics.loss")}
          value={`${formatMoney(summary.lossTotal)}`}
          description={t("analytics.thisMonthToday", { month: formatMoney(summary.lossThisMonth), today: formatMoney(summary.lossToday) })}
          icon={TrendingDown}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-primary" />
            <h2 className="text-lg font-bold text-primary sm:text-xl">
              {t("analytics.salesPerformance")}
            </h2>
          </div>
          <dl className="grid gap-3 sm:grid-cols-2">
            <PerfRow
              label={t("analytics.revenueThisMonth")}
              value={`${formatMoney(salesPerformance.revenueThisMonth)}`}
            />
            <PerfRow
              label={t("analytics.growthVsPrev")}
              value={growthLabel(salesPerformance.growthPct)}
            />
            <PerfRow
              label={t("analytics.salesCount")}
              value={String(salesPerformance.salesCountThisMonth)}
            />
            <PerfRow
              label={t("analytics.avgInvoice")}
              value={`${formatMoney(salesPerformance.avgOrderValueThisMonth)}`}
            />
            <PerfRow
              label={t("analytics.grossProfit")}
              value={`${formatMoney(salesPerformance.grossProfitThisMonth)}`}
            />
            <PerfRow
              label={t("analytics.revenueToday")}
              value={`${formatMoney(salesPerformance.revenueToday)}`}
            />
          </dl>
        </div>

        <div className="rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <ShoppingBasket size={18} className="text-primary" />
            <h2 className="text-lg font-bold text-primary sm:text-xl">
              {t("analytics.purchasePerformance")}
            </h2>
          </div>
          <dl className="grid gap-3 sm:grid-cols-2">
            <PerfRow
              label={t("analytics.expensesThisMonth")}
              value={`${formatMoney(purchasePerformance.expensesThisMonth)}`}
            />
            <PerfRow
              label={t("analytics.growthVsPrev")}
              value={growthLabel(purchasePerformance.growthPct)}
            />
            <PerfRow
              label={t("analytics.purchasesCount")}
              value={String(purchasePerformance.purchasesCountThisMonth)}
            />
            <PerfRow
              label={t("analytics.avgPurchase")}
              value={`${formatMoney(purchasePerformance.avgPurchaseValueThisMonth)}`}
            />
            <PerfRow
              label={t("analytics.expensesTotal")}
              value={`${formatMoney(purchasePerformance.expensesTotal)}`}
            />
            <PerfRow
              label={t("analytics.expensesToday")}
              value={`${formatMoney(purchasePerformance.expensesToday)}`}
            />
          </dl>
        </div>
      </div>

      <div className="grid gap-6">
        <ChartCard title={t("analytics.monthlyChart")}>
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
                formatter={(value) => `${formatMoney(Number(value ?? 0))}`}
              />
              <Legend />
              <Bar
                dataKey="sales"
                name={t("analytics.sales")}
                fill={SALES}
                radius={[6, 6, 0, 0]}
              />
              <Bar
                dataKey="purchases"
                name={t("analytics.purchases")}
                fill={PURCHASES}
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard title={t("analytics.stockUnitsTrend")}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChartLike
              data={data.stockTrend}
              dataKey="value"
              name={t("analytics.units")}
              color={PURCHASES}
            />
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title={t("analytics.salesTrend")}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChartLike
              data={data.salesTrend}
              dataKey="value"
              name={t("analytics.sales")}
              color={SALES}
              money
            />
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title={t("analytics.purchasesTrend")}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChartLike
              data={data.purchaseTrend}
              dataKey="value"
              name={t("analytics.purchases")}
              color={PURCHASES}
              money
            />
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title={t("analytics.lowStockTrend")}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChartLike
              data={data.lowStockTrend}
              dataKey="value"
              name={t("analytics.lowStock")}
              color="#dc2626"
            />
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title={t("analytics.healthTrend")}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChartLike
              data={data.healthTrend}
              dataKey="value"
              name={t("analytics.healthPct")}
              color="#16a34a"
            />
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid gap-6">
        <ChartCard title={t("analytics.yearlyChart")}>
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
                formatter={(value) => `${formatMoney(Number(value ?? 0))}`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="sales"
                name={t("analytics.sales")}
                stroke={SALES}
                strokeWidth={3}
                dot
              />
              <Line
                type="monotone"
                dataKey="purchases"
                name={t("analytics.purchases")}
                stroke={PURCHASES}
                strokeWidth={3}
                dot
              />
              <Line
                type="monotone"
                dataKey="profit"
                name={t("analytics.profitLoss")}
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
              {t("analytics.warehouseDist")}
            </h2>
          </div>
          {data.warehouseDistribution.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("analytics.noWarehouses")}</p>
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
                      {t("analytics.warehouseMeta", {
                        units: formatStockQty(w.units),
                        health: w.healthScore,
                      })}
                      {w.capacityPct != null
                        ? t("analytics.capacityPct", { pct: w.capacityPct })
                        : ""}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <RankCard
          title={t("analytics.topSold")}
          icon={Package}
          empty={t("analytics.emptySales")}
          rows={data.topProducts.map((p) => ({
            id: p.id,
            title: p.name,
            subtitle: p.sku,
            meta: t("analytics.qtyPieces", { qty: formatMoney(p.quantity) }),
            value: `${formatMoney(p.revenue)}`,
            href: `/dashboard/products/${p.id}`,
          }))}
        />
        <RankCard
          title={t("analytics.slowMoving")}
          icon={TrendingDown}
          empty={t("analytics.emptySlow")}
          rows={data.slowMovingProducts.map((p) => ({
            id: p.id,
            title: p.name,
            subtitle: p.sku,
            meta: t("analytics.days90", { qty: formatMoney(p.quantity) }),
            value: `${formatMoney(p.revenue)}`,
            href: `/dashboard/products/${p.id}`,
          }))}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <RankCard
          title={t("analytics.lowStock")}
          icon={AlertTriangle}
          empty={t("analytics.emptyLow")}
          rows={data.lowStock.map((p) => ({
            id: p.id,
            title: p.name,
            subtitle: p.sku,
            meta: t("analytics.stockMeta", { available: formatStockQty(p.availableStock, p.unit), minimum: formatStockQty(p.minimumStock, p.unit) }),
            value: formatStockQty(p.currentStock, p.unit),
            href: `/dashboard/products/${p.id}`,
            danger: true,
          }))}
        />
        <RankCard
          title={t("analytics.outOfStock")}
          icon={Boxes}
          empty={t("analytics.emptyOut")}
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
          title={t("analytics.bestCustomers")}
          icon={Users}
          empty={t("analytics.emptyCustomers")}
          rows={data.bestCustomers.map((c) => ({
            id: c.id,
            title: c.name,
            subtitle: t("analytics.invoicesCount", { count: c.orders }),
            meta: "",
            value: `${formatMoney(c.revenue)}`,
            href: `/dashboard/customers/${c.id}/edit`,
          }))}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <RankCard
          title={t("analytics.inventoryAlerts")}
          icon={AlertTriangle}
          empty={t("analytics.emptyAlerts")}
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
            title={t("analytics.recentSales")}
            icon={DollarSign}
            empty={t("analytics.emptySales")}
            rows={data.recentSales.map((s) => ({
              id: s.id,
              title: s.invoiceNo,
              subtitle: s.customer,
              meta: formatDate(s.date),
              value: `${formatMoney(s.total)}`,
              href: `/dashboard/sales/${s.id}`,
            }))}
          />
          <RankCard
            title={t("analytics.recentPurchases")}
            icon={Truck}
            empty={t("analytics.emptyPurchases")}
            rows={data.recentPurchases.map((p) => ({
              id: p.id,
              title: p.invoiceNo,
              subtitle: p.supplier,
              meta: formatDate(p.date),
              value: `${formatMoney(p.total)}`,
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
            ? `${formatMoney(Number(value ?? 0))}`
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
