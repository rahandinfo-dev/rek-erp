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
import { formatMoney } from "@/lib/utils/format";
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
  DATE_RANGE_OPTIONS,
  GRANULARITY_OPTIONS,
  type ChartGranularity,
  type DateRangePreset,
} from "@/lib/reports/dateRange";
import { DS } from "@/lib/design-system";
import { useFormDraft } from "@/lib/hooks/useFormDraft";
import { DRAFT_KEYS } from "@/lib/drafts/types";
import { AutoSaveBar, AutoSaveStatus } from "@/components/ui/AutoSaveStatus";
import ContextMenuSurface from "@/components/quick-actions/ContextMenuSurface";

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

export default function ReportsClient({ companyName, initialData }: Props) {
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
          appToast.error(json.message || "هەڵەیەک ڕوویدا.");
          return;
        }
        startTransition(() => setData(json.data as ReportsPayload));
      } catch {
        appToast.error("هەڵەیەک ڕوویدا.");
      }
    },
    [customFrom, customTo]
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
        Label: "Revenue",
        Value: data.summary.revenue,
      },
      {
        Section: "Summary",
        Label: "Expenses",
        Value: data.summary.expenses,
      },
      {
        Section: "Summary",
        Label: "Profit",
        Value: data.summary.profit,
      },
      {
        Section: "Summary",
        Label: "Average Sale",
        Value: data.summary.averageSale,
      },
      {
        Section: "Summary",
        Label: "Average Purchase",
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
          label: "Reports",
          href: "/dashboard/reports",
          entityType: "Report",
        }}
      >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-black text-primary sm:text-4xl">
            ڕاپۆرتەکان
          </h1>
          <p className="mt-2 text-muted-foreground">
            فرۆشتن · کڕین · قازانج — {companyName}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/analytics"
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-border px-4 text-sm font-semibold text-primary"
          >
            شیکاری تەواو
          </Link>
          <button
            type="button"
            onClick={() => {
              if (!printRef.current) return;
              void exportElementToPdf(printRef.current, "reports.pdf");
              markDownloaded("/dashboard/reports", "Reports PDF", "reports");
              appToast.pdfGenerated("ڕاپۆرت وەک PDF داگیرا.");
            }}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-primary/30 px-4 text-sm font-semibold text-primary"
          >
            <Download size={16} />
            PDF
          </button>
          <button
            type="button"
            onClick={() => {
              void exportToExcel("reports.xlsx", "Reports", exportRows());
              markDownloaded("/dashboard/reports", "Reports Excel", "reports");
              appToast.success("Excel داگیرا.");
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
              appToast.success("CSV داگیرا.");
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
          label: "Expenses",
          href: "/dashboard/reports",
          entityType: "Expense",
        }}
      >
      <div className="rek-card space-y-3 p-4">
        <div className="flex flex-wrap gap-1.5">
          {DATE_RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setPreset(opt.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                preset === opt.id
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-muted-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {preset === "custom" ? (
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm">
              <span className="mb-1 block font-bold">لە</span>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-10 rounded-xl border border-border px-3"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-bold">تا</span>
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
              جێبەجێکردن
            </button>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-1.5 border-t border-border pt-3">
          <span className="me-2 self-center text-xs font-bold text-muted-foreground">
            چارتی فرۆشتن / کڕین:
          </span>
          {GRANULARITY_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setGranularity(opt.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                granularity === opt.id
                  ? "bg-[color-mix(in_srgb,var(--info)_18%,white)] text-[var(--info)]"
                  : "border border-border bg-card text-muted-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
          {pending ? (
            <span className="ms-auto self-center text-xs text-muted-foreground">
              نوێکردنەوە…
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
            title="داهات"
            value={`${formatMoney(summary.revenue)} IQD`}
            description={`${summary.salesCount} فرۆشتن`}
            icon={DollarSign}
            accent="sales"
          />
          <StatCard
            title="خەرجی"
            value={`${formatMoney(summary.expenses)} IQD`}
            description={`${summary.purchasesCount} کڕین`}
            icon={ShoppingBasket}
            accent="purchases"
          />
          <StatCard
            title="قازانج"
            value={`${formatMoney(summary.profit)} IQD`}
            description="داهات − خەرجی"
            icon={TrendingUp}
          />
          <StatCard
            title="ناوەندی فرۆشتن / کڕین"
            value={`${formatMoney(summary.averageSale)} / ${formatMoney(summary.averagePurchase)}`}
            description="IQD"
            icon={ShoppingCart}
          />
        </div>

        <div className="rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <h2 className="mb-4 text-xl font-bold text-primary">
            فرۆشتن بەرامبەر کڕین
          </h2>
          <div className="mb-3 flex flex-wrap gap-3 text-xs font-bold">
            <span className="inline-flex items-center gap-1.5">
              <span
                className="size-3 rounded-sm"
                style={{ background: SALES_COLOR }}
              />
              فرۆشتن
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="size-3 rounded-sm"
                style={{ background: PURCHASES_COLOR }}
              />
              کڕین
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
                    `${formatMoney(Number(value ?? 0))} IQD`
                  }
                />
                <Legend />
                <Bar
                  dataKey="sales"
                  name="فرۆشتن"
                  fill={SALES_COLOR}
                  radius={[8, 8, 0, 0]}
                />
                <Bar
                  dataKey="purchases"
                  name="کڕین"
                  fill={PURCHASES_COLOR}
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          <ListCard title="دوایین فرۆشتن" icon={ShoppingCart}>
            {data.latestSales.length === 0 ? (
              <Empty />
            ) : (
              data.latestSales.map((s) => (
                <Row
                  key={s.id}
                  title={s.invoiceNo}
                  subtitle={s.customer}
                  value={`${formatMoney(s.total)} IQD`}
                  href={`/dashboard/sales/${s.id}`}
                />
              ))
            )}
          </ListCard>

          <ListCard title="دوایین کڕین" icon={ShoppingBasket}>
            {data.latestPurchases.length === 0 ? (
              <Empty />
            ) : (
              data.latestPurchases.map((p) => (
                <Row
                  key={p.id}
                  title={p.invoiceNo}
                  subtitle={p.supplier}
                  value={`${formatMoney(p.total)} IQD`}
                  href={`/dashboard/purchases/${p.id}`}
                />
              ))
            )}
          </ListCard>

          <ListCard title="باشترین بەرهەمەکان" icon={Package}>
            {data.topProducts.length === 0 ? (
              <Empty />
            ) : (
              data.topProducts.map((p) => (
                <Row
                  key={p.id}
                  title={p.name}
                  subtitle={`${p.sku} · ${formatMoney(p.quantity)} دانە`}
                  value={`${formatMoney(p.revenue)} IQD`}
                  href={`/dashboard/products/${p.id}`}
                />
              ))
            )}
          </ListCard>

          <ListCard title="باشترین کڕیاران" icon={Users}>
            {data.topCustomers.length === 0 ? (
              <Empty />
            ) : (
              data.topCustomers.map((c) => (
                <Row
                  key={c.id}
                  title={c.name}
                  subtitle={`${c.orders} داواکاری`}
                  value={`${formatMoney(c.revenue)} IQD`}
                  href={`/dashboard/customers/${c.id}/edit`}
                />
              ))
            )}
          </ListCard>

          <ListCard title="باشترین دابینکەران" icon={Truck}>
            {data.topSuppliers.length === 0 ? (
              <Empty />
            ) : (
              data.topSuppliers.map((s) => (
                <Row
                  key={s.id}
                  title={s.name}
                  subtitle={`${s.orders} کڕین`}
                  value={`${formatMoney(s.spent)} IQD`}
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
  return <p className="text-sm text-muted-foreground">هیچ داتایەک نییە.</p>;
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
