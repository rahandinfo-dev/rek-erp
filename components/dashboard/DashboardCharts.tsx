"use client";

import { memo } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney } from "@/lib/utils/format";
import { DS } from "@/lib/design-system";

const SALES = DS.color.chart.sales;
const PURCHASES = DS.color.chart.purchases;
const TOP_COLORS = [
  DS.color.primary,
  DS.color.primaryHover,
  DS.color.chart.profit,
  "#F5D08A",
  "#CC8B35",
];

export type DashboardChartData = {
  monthly: Array<{
    name: string;
    sales: number;
    purchases: number;
    profit: number;
  }>;
  topProducts: Array<{
    name: string;
    revenue: number;
    quantity: number;
  }>;
  lowStockCount: number;
  outOfStockCount?: number;
  inventoryHealthScore?: number;
};

function DashboardCharts({ data }: { data: DashboardChartData }) {
  const pieData = data.topProducts.map((p) => ({
    name: p.name,
    value: p.revenue,
  }));

  return (
    <section className="w-full min-w-0 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-foreground sm:text-2xl">
            شیکاری خێرا
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            داتای ڕاستەقینەی ٦ مانگی ڕابردوو
            {data.lowStockCount > 0 || (data.outOfStockCount ?? 0) > 0
              ? ` · ${data.lowStockCount} کەم · ${data.outOfStockCount ?? 0} تەواو`
              : ""}
            {typeof data.inventoryHealthScore === "number"
              ? ` · تەندروستی ${data.inventoryHealthScore}%`
              : ""}
          </p>
        </div>
        <Link
          href="/dashboard/analytics"
          className="shrink-0 rounded-2xl border border-border bg-card px-4 py-2 text-sm font-bold text-primary transition hover:bg-muted"
        >
          بینینی شیکاری تەواو →
        </Link>
      </div>

      <div className="grid gap-4 sm:gap-6 xl:grid-cols-3">
        <div className="min-w-0 rounded-3xl border border-border bg-card p-3 shadow-sm sm:p-6 xl:col-span-2">
          <h3 className="mb-4 font-bold text-primary">فرۆشتن بەرامبەر کڕین</h3>
          <div className="rek-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                />
                <YAxis
                  width={48}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    color: "var(--popover-foreground)",
                  }}
                  formatter={(value) =>
                    `${formatMoney(Number(value ?? 0))} IQD`
                  }
                />
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
          </div>
        </div>

        <div className="min-w-0 rounded-3xl border border-border bg-card p-3 shadow-sm sm:p-6">
          <h3 className="mb-4 font-bold text-primary">باشترین بەرهەمەکان</h3>
          <div className="rek-chart">
            {pieData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                هیچ فرۆشتنێک نییە
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={48}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {pieData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={TOP_COLORS[i % TOP_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      color: "var(--popover-foreground)",
                    }}
                    formatter={(value) =>
                      `${formatMoney(Number(value ?? 0))} IQD`
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default memo(DashboardCharts);
