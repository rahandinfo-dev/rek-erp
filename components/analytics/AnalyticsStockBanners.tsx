"use client";

import Link from "next/link";
import { AlertTriangle, PackageX } from "lucide-react";
import { formatStockQty } from "@/lib/inventory/stock";
import type { StockAlertItem } from "@/lib/analytics/buildAnalytics";
import { useT } from "@/components/i18n/LocaleProvider";

type Props = {
  lowStock: StockAlertItem[];
  outOfStock: StockAlertItem[];
};

/** Top-of-page stock alerts with product, warehouse, remaining qty. */
export default function AnalyticsStockBanners({
  lowStock,
  outOfStock,
}: Props) {
  const { t } = useT();
  const outs = outOfStock.slice(0, 4);
  const lows = lowStock.slice(0, 4);
  if (outs.length === 0 && lows.length === 0) return null;

  return (
    <div className="space-y-2">
      {outs.map((item) => (
        <Link
          key={`out-${item.id}`}
          href={`/dashboard/products/${item.id}`}
          className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-900 transition hover:brightness-[0.98]"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white">
            <PackageX size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-black">
              ❌ {t("analytics.outBanner", { name: item.name })}
            </p>
            <p className="mt-0.5 text-sm opacity-90">
              {t("analytics.bannerMeta", {
                warehouse: item.warehouseName || "—",
                qty: formatStockQty(item.availableStock),
                unit: item.unit,
              })}
            </p>
          </div>
        </Link>
      ))}
      {lows.map((item) => (
        <Link
          key={`low-${item.id}`}
          href={`/dashboard/products/${item.id}`}
          className="flex items-start gap-3 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-orange-950 transition hover:brightness-[0.98]"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white">
            <AlertTriangle size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-black">
              ⚠️ {t("analytics.lowBanner", { name: item.name })}
            </p>
            <p className="mt-0.5 text-sm opacity-90">
              {t("analytics.bannerMeta", {
                warehouse: item.warehouseName || "—",
                qty: formatStockQty(item.availableStock),
                unit: item.unit,
              })}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
