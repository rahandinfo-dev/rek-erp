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
import { tServer } from "@/lib/i18n";

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
  const t = tServer.t;
  const whValue = warehouseValue ?? inventoryValue;
  const assetValue = currentAssetValue ?? inventoryValue;
  const iqd = t("common.currencyCode");

  const cards = [
    {
      label: t("warehouses.statCapacity"),
      value:
        capacity != null && capacity > 0
          ? capacityPct != null
            ? `${formatNumber(capacity)} · ${capacityPct}%`
            : formatNumber(capacity)
          : "—",
      icon: Gauge,
    },
    {
      label: t("warehouses.statInventoryValue"),
      value: `${formatMoney(inventoryValue)} ${iqd}`,
      icon: Wallet,
    },
    {
      label: t("warehouses.statWarehouseValue"),
      value: `${formatMoney(whValue)} ${iqd}`,
      icon: Warehouse,
    },
    {
      label: t("warehouses.statPurchaseValue"),
      value: `${formatMoney(purchaseValue)} ${iqd}`,
      icon: ShoppingBasket,
    },
    {
      label: t("warehouses.statSalesValue"),
      value: `${formatMoney(salesValue)} ${iqd}`,
      icon: ShoppingCart,
    },
    {
      label: t("warehouses.statAssetValue"),
      value: `${formatMoney(assetValue)} ${iqd}`,
      icon: Landmark,
    },
    {
      label: t("warehouses.statAvgCost"),
      value: `${formatMoney(averageCost)} ${iqd}`,
      icon: Calculator,
    },
    {
      label: t("warehouses.statAvailable"),
      value: formatNumber(availableStock),
      icon: Boxes,
    },
    {
      label: t("warehouses.statLow"),
      value: formatNumber(lowStockCount),
      icon: AlertTriangle,
    },
    {
      label: t("warehouses.statOut"),
      value: formatNumber(emptyStockCount),
      icon: PackageX,
    },
    {
      label: t("warehouses.statHealth"),
      value: `${inventoryHealthScore}%`,
      icon: HeartPulse,
    },
    {
      label: t("warehouses.statTotalProducts"),
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
