"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Package,
  ShoppingBasket,
  ShoppingCart,
  Truck,
  Users,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import { formatMoney, formatQuantityWithUnit } from "@/lib/utils/format";
import {
  exportElementToPdf,
  exportToCsv,
  exportToExcel,
} from "@/lib/export";
import { appToast } from "@/lib/toast";
import { useNavigationHistory } from "@/lib/history/provider";
import StatCard from "@/components/dashboard/StatCard";
import type { ReportsPayload } from "@/lib/reports/buildReports";
import {
  type ChartGranularity,
  type DateRangePreset,
} from "@/lib/reports/dateRange";
import { DS } from "@/lib/design-system";
import { useFormDraft } from "@/lib/hooks/useFormDraft";
import { DRAFT_KEYS } from "@/lib/drafts/types";
import { AutoSaveBar, AutoSaveStatus } from "@/components/ui/AutoSaveStatus";
import ContextMenuSurface from "@/components/quick-actions/ContextMenuSurface";
import { useT } from "@/components/i18n/LocaleProvider";

const SALES_COLOR = DS.color.chart.sales;
const PURCHASES_COLOR = DS.color.chart.purchases;

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  color: "var(--popover-foreground)",
};

type Props = {
  companyName: string;
  initialData: ReportsPayload;
};

const DATE_RANGE_IDS: DateRangePreset[] = [
  "today",
  "yesterday",
  "week",
  "month",
  "year",
  "custom",
];

const GRANULARITY_IDS: ChartGranularity[] = [
  "daily",
  "weekly",
  "monthly",
  "yearly",
];

export default function ReportsClient({ companyName, initialData }: Props) {
  const { t } = useT();
  const printRef = useRef<HTMLDivElement>(null);
  const { markDownloaded } = useNavigationHistory();
  const [data, setData] = useState(initialData);
  const [preset, setPreset] = useState<DateRangePreset>(
    initialData.range.preset
  );
  const [granularity, setGranularity] = useState<ChartGranularity>(
    initialData.granularity
  );
  const [customFrom, setCustomFrom] = useState(
    initialData.range.from.slice(0, 10)
  );
  const [customTo, setCustomTo] = useState(initialData.range.to.slice(0, 10));
  const [pending, startTransition] = useTransition();

  const filterDraft = useMemo(
    () => ({ preset, granularity, customFrom, customTo }),
    [preset, granularity, customFrom, customTo]
  );

  const {
    status: draftStatus,
    savedAt: draftSavedAt,
    hasPendingDraft,
    pendingDraft,
    restoreDraft,
    discardDraft,
  } = useFormDraft({
    key: DRAFT_KEYS.reportsFilters,
    value: filterDraft,
    isEmpty: () => false,
  });

  const load = useCallback(
    async (nextPreset: DateRangePreset, nextGranularity: ChartGranularity) => {
      const params = new URLSearchParams({
        preset: nextPreset,
        granularity: nextGranularity,
      });
      if (nextPreset === "custom") {
        params.set("from", customFrom);
        params.set("to", customTo);
      }
      try {
        const res = await fetch(`/api/reports?${params.toString()}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (!json.success) {
          appToast.error(json.message || t("errors.generic"));
          return;
        }
        startTransition(() => setData(json.data as ReportsPayload));
      } catch {
        appToast.error(t("errors.generic"));
      }
    },
    [customFrom, customTo, t]
  );

  const skipFirst = useRef(true);
  useEffect(() => {
    if (skipFirst.current) {
      skipFirst.current = false;
      return;
    }
    void load(preset, granularity);
  }, [preset, granularity, load]);

  function exportRows(): Record<string, string | number>[] {
    return [
      {
        Section: "Summary",
        Label: t("reports.exportRevenue"),
        Value: data.summary.revenue,
      },
      {
        Section: "Summary",
        Label: t("reports.exportExpenses"),
        Value: data.summary.expenses,
      },
      {
        Section: "Summary",
        Label: t("reports.exportProfit"),
        Value: data.summary.profit,
      },
      {
        Section: "Summary",
        Label: t("reports.exportAvgSale"),
        Value: data.summary.averageSale,
      },
      {
        Section: "Summary",
        Label: t("reports.exportAvgPurchase"),
        Value: data.summary.averagePurchase,
      },
      ...data.chart.map((c) => ({
        Section: "Chart",
        Label: c.name,
        Sales: c.sales,
        Purchases: c.purchases,
        Profit: c.profit,
        Value: c.profit,
      })),
    ];
  }

  const { summary } = data;

  return (
    <div className="space-y-6 sm:space-y-8">
      <AutoSaveBar
        status={draftStatus}
        savedAt={draftSavedAt}
        hasPendingDraft={hasPendingDraft}
        pendingSavedAt={pendingDraft?.savedAt}
        onRestore={() => {
          const d = restoreDraft();
          if (!d) return;
          setPreset(d.preset);
          setGranularity(d.granularity);
          setCustomFrom(d.customFrom);
          setCustomTo(d.customTo);
        }}
        onDiscard={discardDraft}
      />

      <ContextMenuSurface
        className="rounded-2xl"
        record={{
          id: "reports-current",
          moduleKey: "reports",
          label: t("reports.title"),
          href: "/dashboard/reports",
          entityType: "Report",
        }}
      >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-black text-primary sm:text-4xl">
            {t("reports.title")}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {t("reports.subtitle", { name: companyName })}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/analytics"
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-border px-4 text-sm font-semibold text-primary"
          >
            {t("reports.fullAnalytics")}
          </Link>
          <button
            type="button"
            onClick={() => {
              if (!printRef.current) return;
              void exportElementToPdf(printRef.current, "reports.pdf");
              markDownloaded("/dashboard/reports", t("reports.pdfLabel"), "reports");
              appToast.pdfGenerated(t("reports.pdfDownloaded"));
            }}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-primary/30 px-4 text-sm font-semibold text-primary"
          >
            <Download size={16} />
            PDF
          </button>
          <button
            type="button"
            onClick={() => {
              void exportToExcel("reports.xlsx", t("reports.title"), exportRows());
              markDownloaded("/dashboard/reports", t("reports.excelLabel"), "reports");
              appToast.success(t("reports.excelDownloaded"));
            }}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-border px-4 text-sm font-semibold"
          >
            <FileSpreadsheet size={16} />
            Excel
          </button>
          <button
            type="button"
            onClick={() => {
              exportToCsv("reports.csv", exportRows());
              appToast.success(t("reports.csvDownloaded"));
            }}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-border px-4 text-sm font-semibold"
          >
            <FileText size={16} />
            CSV
          </button>
        </div>
      </div>
      </ContextMenuSurface>

      <ContextMenuSurface
        className="rounded-2xl"
        record={{
          id: "expenses-summary",
          moduleKey: "expenses",
          label: t("reports.expensesLabel"),
          href: "/dashboard/reports",
          entityType: "Expense",
        }}
      >
      <div className="rek-card space-y-3 p-4">
        <div className="flex flex-wrap gap-1.5">
          {DATE_RANGE_IDS.map((opt) => {
            const labels: Record<DateRangePreset, string> = {
              today: t("common.today"),
              yesterday: t("reports.yesterday"),
              week: t("common.thisWeek"),
              month: t("common.thisMonth"),
              year: t("reports.year"),
              custom: t("reports.customRange"),
            };
            return (
            <button
              key={opt}
              type="button"
              onClick={() => setPreset(opt)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                preset === opt
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-muted-foreground"
              }`}
            >
              {labels[opt]}
            </button>
            );
          })}
        </div>

        {preset === "custom" ? (
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm">
              <span className="mb-1 block font-bold">{t("reports.from")}</span>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-10 rounded-xl border border-border px-3"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-bold">{t("reports.to")}</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-10 rounded-xl border border-border px-3"
              />
            </label>
            <button
              type="button"
              disabled={pending}
              onClick={() => void load("custom", granularity)}
              className="h-10 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              {t("reports.apply")}
            </button>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-1.5 border-t border-border pt-3">
          <span className="me-2 self-center text-xs font-bold text-muted-foreground">
            {t("reports.chartSalesPurchases")}
          </span>
          {GRANULARITY_IDS.map((opt) => {
            const labels: Record<ChartGranularity, string> = {
              daily: t("reports.daily"),
              weekly: t("reports.weekly"),
              monthly: t("reports.monthly"),
              yearly: t("reports.yearly"),
            };
            return (
            <button
              key={opt}
              type="button"
              onClick={() => setGranularity(opt)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                granularity === opt
                  ? "bg-[color-mix(in_srgb,var(--info)_18%,white)] text-[var(--info)]"
                  : "border border-border bg-card text-muted-foreground"
              }`}
            >
              {labels[opt]}
            </button>
            );
          })}
          {pending ? (
            <span className="ms-auto self-center text-xs text-muted-foreground">
              {t("reports.refreshing")}
            </span>
          ) : (
            <span className="ms-auto self-center">
              <AutoSaveStatus status={draftStatus} savedAt={draftSavedAt} />
            </span>
          )}
        </div>
      </div>
      </ContextMenuSurface>

      <div ref={printRef} className="space-y-6">
        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title={t("reports.revenue")}
            value={`${formatMoney(summary.revenue)}`}
            description={t("reports.salesCount", { count: summary.salesCount })}
            icon={DollarSign}
            accent="sales"
          />
          <StatCard
            title={t("reports.expenses")}
            value={`${formatMoney(summary.expenses)}`}
            description={t("reports.purchasesCount", { count: summary.purchasesCount })}
            icon={ShoppingBasket}
            accent="purchases"
          />
          <StatCard
            title={t("reports.profit")}
            value={`${formatMoney(summary.profit)}`}
            description={t("reports.profitFormula")}
            icon={TrendingUp}
          />
          <StatCard
            title={t("reports.avgSalePurchase")}
            value={`${formatMoney(summary.averageSale)} / ${formatMoney(summary.averagePurchase)}`}
            description={t("reports.average")}
            icon={ShoppingCart}
          />
        </div>

        <div className="rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <h2 className="mb-4 text-xl font-bold text-primary">
            {t("reports.salesVsPurchases")}
          </h2>
          <div className="mb-3 flex flex-wrap gap-3 text-xs font-bold">
            <span className="inline-flex items-center gap-1.5">
              <span
                className="size-3 rounded-sm"
                style={{ background: SALES_COLOR }}
              />
              {t("reports.sales")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="size-3 rounded-sm"
                style={{ background: PURCHASES_COLOR }}
              />
              {t("reports.purchases")}
            </span>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value) =>
                    `${formatMoney(Number(value ?? 0))}`
                  }
                />
                <Legend />
                <Bar
                  dataKey="sales"
                  name={t("reports.sales")}
                  fill={SALES_COLOR}
                  radius={[8, 8, 0, 0]}
                />
                <Bar
                  dataKey="purchases"
                  name={t("reports.purchases")}
                  fill={PURCHASES_COLOR}
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          <ListCard title={t("reports.latestSales")} icon={ShoppingCart}>
            {data.latestSales.length === 0 ? (
              <Empty />
            ) : (
              data.latestSales.map((s) => (
                <Row
                  key={s.id}
                  title={s.invoiceNo}
                  subtitle={s.customer}
                  value={`${formatMoney(s.total)}`}
                  href={`/dashboard/sales/${s.id}`}
                />
              ))
            )}
          </ListCard>

          <ListCard title={t("reports.latestPurchases")} icon={ShoppingBasket}>
            {data.latestPurchases.length === 0 ? (
              <Empty />
            ) : (
              data.latestPurchases.map((p) => (
                <Row
                  key={p.id}
                  title={p.invoiceNo}
                  subtitle={p.supplier}
                  value={`${formatMoney(p.total)}`}
                  href={`/dashboard/purchases/${p.id}`}
                />
              ))
            )}
          </ListCard>

          <ListCard title={t("reports.topProducts")} icon={Package}>
            {data.topProducts.length === 0 ? (
              <Empty />
            ) : (
              data.topProducts.map((p) => (
                <Row
                  key={p.id}
                  title={p.name}
                  subtitle={`${p.sku} · ${formatQuantityWithUnit(p.quantity, "دانە")}`}
                  value={`${formatMoney(p.revenue)}`}
                  href={`/dashboard/products/${p.id}`}
                />
              ))
            )}
          </ListCard>

          <ListCard title={t("reports.topCustomers")} icon={Users}>
            {data.topCustomers.length === 0 ? (
              <Empty />
            ) : (
              data.topCustomers.map((c) => (
                <Row
                  key={c.id}
                  title={c.name}
                  subtitle={t("reports.ordersCount", { count: c.orders })}
                  value={`${formatMoney(c.revenue)}`}
                  href={`/dashboard/customers/${c.id}/edit`}
                />
              ))
            )}
          </ListCard>

          <ListCard title={t("reports.topSuppliers")} icon={Truck}>
            {data.topSuppliers.length === 0 ? (
              <Empty />
            ) : (
              data.topSuppliers.map((s) => (
                <Row
                  key={s.id}
                  title={s.name}
                  subtitle={t("reports.purchaseOrders", { count: s.orders })}
                  value={`${formatMoney(s.spent)}`}
                  href={`/dashboard/suppliers/${s.id}/edit`}
                />
              ))
            )}
          </ListCard>
        </div>
      </div>
    </div>
  );
}

function Empty() {
  const { t } = useT();
  return <p className="text-sm text-muted-foreground">{t("common.empty")}</p>;
}

function ListCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-center gap-2 font-bold text-primary">
        <Icon size={18} />
        {title}
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Row({
  title,
  subtitle,
  value,
  href,
}: {
  title: string;
  subtitle: string;
  value: string;
  href?: string;
}) {
  const body = (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-muted/40 px-3 py-2.5">
      <div className="min-w-0">
        <p className="truncate font-bold text-foreground">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <p className="shrink-0 text-sm font-bold tabular-nums text-primary">
        {value}
      </p>
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="block transition hover:opacity-90">
        {body}
      </Link>
    );
  }
  return body;
}
