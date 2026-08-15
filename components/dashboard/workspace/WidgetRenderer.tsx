"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Package, ShoppingCart, Truck, Users, Wifi, Activity } from "lucide-react";
import DashboardStatCard from "@/components/dashboard/DashboardStatCard";
import QuickAction from "@/components/dashboard/QuickAction";
import {
  RecentInvoicesList,
  RecentSalesList,
} from "@/components/dashboard/RecentLists";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import FavoritePagesWidget from "@/components/favorites/FavoritePagesWidget";
import RecentlyViewedWidget from "@/components/history/RecentlyViewedWidget";
import HistoryActionListWidget from "@/components/history/HistoryActionListWidget";
import SimpleListCard from "@/components/dashboard/workspace/SimpleListCard";
import { useSessionRecovery } from "@/lib/recovery/provider";
import { useT } from "@/components/i18n/LocaleProvider";
import type { loadDashboardHome } from "@/lib/dashboard/home";
import type { WidgetInstance } from "@/lib/dashboard/workspace/types";

const widgetFallback = () => (
  <div className="rek-skeleton h-40 rounded-2xl" aria-hidden />
);

const DashboardCharts = dynamic(
  () => import("@/components/dashboard/DashboardCharts"),
  {
    loading: () => <div className="rek-skeleton h-64 rounded-3xl" />,
    ssr: false,
  }
);

const ContinueWorkingDraftWidget = dynamic(
  () =>
    import("@/components/drafts/DraftWidgets").then(
      (m) => m.ContinueWorkingDraftWidget
    ),
  { loading: widgetFallback, ssr: false }
);
const DraftStatisticsWidget = dynamic(
  () =>
    import("@/components/drafts/DraftWidgets").then(
      (m) => m.DraftStatisticsWidget
    ),
  { loading: widgetFallback, ssr: false }
);
const PinnedDraftsWidget = dynamic(
  () =>
    import("@/components/drafts/DraftWidgets").then((m) => m.PinnedDraftsWidget),
  { loading: widgetFallback, ssr: false }
);
const RecentDraftsWidget = dynamic(
  () =>
    import("@/components/drafts/DraftWidgets").then((m) => m.RecentDraftsWidget),
  { loading: widgetFallback, ssr: false }
);
const RecoveryStatusWidget = dynamic(
  () =>
    import("@/components/drafts/DraftWidgets").then(
      (m) => m.RecoveryStatusWidget
    ),
  { loading: widgetFallback, ssr: false }
);

const FailedOperationsWidget = dynamic(
  () =>
    import("@/components/activity/ActivityWidgets").then(
      (m) => m.FailedOperationsWidget
    ),
  { loading: widgetFallback, ssr: false }
);
const MyActivityWidget = dynamic(
  () =>
    import("@/components/activity/ActivityWidgets").then(
      (m) => m.MyActivityWidget
    ),
  { loading: widgetFallback, ssr: false }
);
const RecentActivityWidget = dynamic(
  () =>
    import("@/components/activity/ActivityWidgets").then(
      (m) => m.RecentActivityWidget
    ),
  { loading: widgetFallback, ssr: false }
);
const TeamActivityWidget = dynamic(
  () =>
    import("@/components/activity/ActivityWidgets").then(
      (m) => m.TeamActivityWidget
    ),
  { loading: widgetFallback, ssr: false }
);

const RecentlyDeletedWidget = dynamic(
  () =>
    import("@/components/recycle/RecycleWidgets").then(
      (m) => m.RecentlyDeletedWidget
    ),
  { loading: widgetFallback, ssr: false }
);
const RecycleBinStatsWidget = dynamic(
  () =>
    import("@/components/recycle/RecycleWidgets").then(
      (m) => m.RecycleBinStatsWidget
    ),
  { loading: widgetFallback, ssr: false }
);
const RestoreSuggestionsWidget = dynamic(
  () =>
    import("@/components/recycle/RecycleWidgets").then(
      (m) => m.RestoreSuggestionsWidget
    ),
  { loading: widgetFallback, ssr: false }
);

const BulkStatisticsWidget = dynamic(
  () =>
    import("@/components/bulk/BulkWidgets").then((m) => m.BulkStatisticsWidget),
  { loading: widgetFallback, ssr: false }
);
const RecentBulkOperationsWidget = dynamic(
  () =>
    import("@/components/bulk/BulkWidgets").then(
      (m) => m.RecentBulkOperationsWidget
    ),
  { loading: widgetFallback, ssr: false }
);

const MostEditedRecordsWidget = dynamic(
  () =>
    import("@/components/versions/VersionWidgets").then(
      (m) => m.MostEditedRecordsWidget
    ),
  { loading: widgetFallback, ssr: false }
);
const RecentChangesWidget = dynamic(
  () =>
    import("@/components/versions/VersionWidgets").then(
      (m) => m.RecentChangesWidget
    ),
  { loading: widgetFallback, ssr: false }
);
const RestoreHistoryWidget = dynamic(
  () =>
    import("@/components/versions/VersionWidgets").then(
      (m) => m.RestoreHistoryWidget
    ),
  { loading: widgetFallback, ssr: false }
);

const DuplicateDetectionWidget = dynamic(
  () =>
    import("@/components/numbering/NumberingWidgets").then(
      (m) => m.DuplicateDetectionWidget
    ),
  { loading: widgetFallback, ssr: false }
);
const NumberingStatisticsWidget = dynamic(
  () =>
    import("@/components/numbering/NumberingWidgets").then(
      (m) => m.NumberingStatisticsWidget
    ),
  { loading: widgetFallback, ssr: false }
);

export type DashboardHomeData = Awaited<ReturnType<typeof loadDashboardHome>>;

export default function WidgetRenderer({
  instance,
  data,
}: {
  instance: WidgetInstance;
  data: DashboardHomeData;
}) {
  const { summary } = data;
  const count = instance.settings.itemCount;
  const { connection } = useSessionRecovery();
  const { t } = useT();

  switch (instance.widgetKey) {
    case "stat-products":
      return (
        <DashboardStatCard
          title={t("widgets.stat-products.title")}
          value={summary.productsCount}
          todayChange={0}
          todayLabel=""
          iconName="package"
        />
      );
    case "stat-today-revenue":
      return (
        <DashboardStatCard
          title={t("widgets.stat-today-revenue.title")}
          value={summary.todayRevenue}
          todayChange={summary.todayRevenue}
          todayLabel=""
          iconName="dollarSign"
          money
        />
      );
    case "stat-today-sales":
      return (
        <DashboardStatCard
          title={t("widgets.stat-today-sales.title")}
          value={summary.todaySalesCount}
          todayChange={summary.todaySalesCount}
          todayLabel=""
          iconName="shoppingCart"
        />
      );
    case "stat-low-stock":
      return (
        <DashboardStatCard
          title={t("widgets.stat-low-stock.title")}
          value={summary.lowStockCount}
          todayChange={0}
          todayLabel={t("dashboard.needsAttention")}
          iconName="trendingDown"
        />
      );
    case "stat-out-of-stock":
      return (
        <DashboardStatCard
          title={t("widgets.stat-out-of-stock.title")}
          value={summary.outOfStockCount}
          todayChange={0}
          todayLabel=""
          iconName="trendingDown"
        />
      );
    case "stat-today-purchases":
      return (
        <DashboardStatCard
          title={t("widgets.stat-today-purchases.title")}
          value={0}
          todayChange={0}
          todayLabel={t("dashboard.openPurchases")}
          iconName="shoppingCart"
        />
      );
    case "favorites":
      return <FavoritePagesWidget />;
    case "recently-viewed":
      return <RecentlyViewedWidget />;
    case "drafts":
      return <ContinueWorkingDraftWidget />;
    case "recent-drafts":
      return <RecentDraftsWidget />;
    case "pinned-drafts":
      return <PinnedDraftsWidget />;
    case "draft-stats":
      return <DraftStatisticsWidget />;
    case "recovery-status":
      return <RecoveryStatusWidget />;
    case "history-edited":
      return <HistoryActionListWidget action="edited" title="دوایین دەستکاریکراوەکان" />;
    case "history-created":
      return (
        <HistoryActionListWidget action="created" title="دوایین دروستکراوەکان" />
      );
    case "recent-sales":
      return <RecentSalesList items={data.sales.slice(0, count)} />;
    case "recent-invoices":
      return <RecentInvoicesList items={data.invoices.slice(0, count)} />;
    case "recent-purchases":
      return (
        <SimpleListCard
          title="دوایین کڕینەکان"
          empty="هێشتا هیچ کڕینێک نییە."
          hrefAll="/dashboard/purchases"
          items={[]}
        />
      );
    case "recent-customers":
      return (
        <SimpleListCard
          title={t("widgets.recent-customers.title")}
          empty={t("empty.openCustomers")}
          hrefAll="/dashboard/customers"
          items={[]}
        />
      );
    case "recent-suppliers":
      return (
        <SimpleListCard
          title={t("widgets.recent-suppliers.title")}
          empty={t("empty.openSuppliers")}
          hrefAll="/dashboard/suppliers"
          items={[]}
        />
      );
    case "recent-products":
      return (
        <SimpleListCard
          title={t("widgets.recent-products.title")}
          empty={t("empty.openProducts")}
          hrefAll="/dashboard/products"
          items={[]}
        />
      );
    case "notifications":
      return (
        <ActivityFeed initialItems={data.activityItems.slice(0, count)} />
      );
    case "quick-analytics":
    case "sales-chart":
    case "purchase-chart":
    case "revenue-chart":
    case "expense-chart":
    case "profit-chart":
      return <DashboardCharts data={data.chartData} />;
    case "top-products":
    case "top-customers":
    case "top-suppliers":
      return (
        <SimpleListCard
          title={
            instance.widgetKey === "top-products"
              ? t("widgets.top-products.title")
              : instance.widgetKey === "top-customers"
                ? t("widgets.top-customers.title")
                : t("widgets.top-suppliers.title")
          }
          empty={t("empty.insightsGrow")}
          hrefAll={
            instance.widgetKey === "top-products"
              ? "/dashboard/products"
              : instance.widgetKey === "top-customers"
                ? "/dashboard/customers"
                : "/dashboard/suppliers"
          }
          items={[]}
        />
      );
    case "employee-alerts":
    case "salary-alerts":
      return (
        <SimpleListCard
          title={
            instance.widgetKey === "salary-alerts"
              ? t("widgets.salary-alerts.title")
              : t("widgets.employee-alerts.title")
          }
          empty={t("empty.noAlerts")}
          hrefAll="/dashboard/employees"
          items={[]}
        />
      );
    case "audit-activity":
      return <RecentActivityWidget />;
    case "my-activity":
      return <MyActivityWidget />;
    case "team-activity":
      return <TeamActivityWidget />;
    case "failed-operations":
      return <FailedOperationsWidget />;
    case "recently-deleted":
      return <RecentlyDeletedWidget />;
    case "restore-suggestions":
      return <RestoreSuggestionsWidget />;
    case "recycle-bin-stats":
      return <RecycleBinStatsWidget />;
    case "recent-bulk-ops":
      return <RecentBulkOperationsWidget />;
    case "bulk-stats":
      return <BulkStatisticsWidget />;
    case "numbering-stats":
      return <NumberingStatisticsWidget />;
    case "duplicate-detection":
      return <DuplicateDetectionWidget />;
    case "recent-changes":
      return <RecentChangesWidget />;
    case "most-edited-records":
      return <MostEditedRecordsWidget />;
    case "restore-history":
      return <RestoreHistoryWidget />;
    case "quick-actions":
      return (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <QuickAction
            title="فرۆشتنی نوێ"
            href="/dashboard/sales/new"
            icon={ShoppingCart}
          />
          <QuickAction
            title="بەرهەمی نوێ"
            href="/dashboard/products/new"
            icon={Package}
          />
          <QuickAction
            title="کڕیاری نوێ"
            href="/dashboard/customers/new"
            icon={Users}
          />
          <QuickAction
            title="دابینکەری نوێ"
            href="/dashboard/suppliers/new"
            icon={Truck}
          />
        </div>
      );
    case "system-status":
      return (
        <section className="rek-card flex items-center gap-3 p-5">
          <Activity size={18} className="text-primary" />
          <div>
            <p className="text-sm font-black">{t("status.systemStatus")}</p>
            <p className="text-xs text-muted-foreground">
              {t("status.operational")}
            </p>
          </div>
        </section>
      );
    case "live-connection":
      return (
        <section className="rek-card flex items-center gap-3 p-5">
          <Wifi
            size={18}
            className={
              connection === "offline" ? "text-destructive" : "text-primary"
            }
          />
          <div>
            <p className="text-sm font-black">{t("status.liveConnection")}</p>
            <p className="text-xs text-muted-foreground">
              {connection === "offline"
                ? t("status.offline")
                : t("status.online")}
            </p>
          </div>
          <Link
            href="/dashboard/recovery"
            className="ms-auto text-xs font-bold text-primary"
          >
            {t("common.details")}
          </Link>
        </section>
      );
    default:
      return null;
  }
}
