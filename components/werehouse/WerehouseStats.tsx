import {
  AlertTriangle,
  Boxes,
  Calculator,
  Gauge,
  HeartPulse,
  Landmark,
  Package,
  PackageX,
  ShoppingBasket,
  ShoppingCart,
  Wallet,
  Warehouse,
} from "lucide-react";
import { formatMoney , formatNumber} from "@/lib/utils/format";

type Props = {
  totalItems: number;
  availableStock: number;
  lowStockCount: number;
  emptyStockCount: number;
  inventoryValue?: number;
  warehouseValue?: number;
  purchaseValue?: number;
  salesValue?: number;
  currentAssetValue?: number;
  averageCost?: number;
  inventoryHealthScore?: number;
  capacity?: number | null;
  capacityPct?: number | null;
};

export default function WerehouseStats({
  totalItems,
  availableStock,
  lowStockCount,
  emptyStockCount,
  inventoryValue = 0,
  warehouseValue,
  purchaseValue = 0,
  salesValue = 0,
  currentAssetValue,
  averageCost = 0,
  inventoryHealthScore = 100,
  capacity = null,
  capacityPct = null,
}: Props) {
  const whValue = warehouseValue ?? inventoryValue;
  const assetValue = currentAssetValue ?? inventoryValue;

  const cards = [
    {
      label: "توانای کۆگا",
      value:
        capacity != null && capacity > 0
          ? capacityPct != null
            ? `${formatNumber(capacity)} · ${capacityPct}%`
            : formatNumber(capacity)
          : "—",
      icon: Gauge,
    },
    {
      label: "بەهای ئینڤێنتۆری",
      value: `${formatMoney(inventoryValue)} IQD`,
      icon: Wallet,
    },
    {
      label: "بەهای کۆگا",
      value: `${formatMoney(whValue)} IQD`,
      icon: Warehouse,
    },
    {
      label: "بەهای کڕین",
      value: `${formatMoney(purchaseValue)} IQD`,
      icon: ShoppingBasket,
    },
    {
      label: "بەهای فرۆشتن",
      value: `${formatMoney(salesValue)} IQD`,
      icon: ShoppingCart,
    },
    {
      label: "بەهای سەروەت",
      value: `${formatMoney(assetValue)} IQD`,
      icon: Landmark,
    },
    {
      label: "تێکڕای تێچوو",
      value: `${formatMoney(averageCost)} IQD`,
      icon: Calculator,
    },
    {
      label: "کۆگای بەردەست",
      value: formatNumber(availableStock),
      icon: Boxes,
    },
    {
      label: "کۆگای کەم",
      value: formatNumber(lowStockCount),
      icon: AlertTriangle,
    },
    {
      label: "تەواو",
      value: formatNumber(emptyStockCount),
      icon: PackageX,
    },
    {
      label: "تەندروستی کۆگا",
      value: `${inventoryHealthScore}%`,
      icon: HeartPulse,
    },
    {
      label: "کۆی بەرهەمەکان",
      value: formatNumber(totalItems),
      icon: Package,
    },
  ] as const;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {cards.map(({ label, value, icon: Icon }) => (
        <article key={label} className="rek-stat-card">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-muted-foreground">
                {label}
              </p>
              <h2 className="mt-2 truncate text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                {value}
              </h2>
            </div>
            <div className="rek-stat-icon">
              <Icon size={24} aria-hidden />
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
