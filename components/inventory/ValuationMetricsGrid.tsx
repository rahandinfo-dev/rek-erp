import {
  Calculator,
  Landmark,
  ShoppingBasket,
  ShoppingCart,
  Warehouse,
  Wallet,
} from "lucide-react";
import { formatMoney } from "@/lib/utils/format";
import {
  VALUATION_LABELS,
  type ValuationMetrics,
} from "@/lib/inventory/valuationMetrics";

type Props = {
  metrics: ValuationMetrics;
  title?: string;
  subtitle?: string;
  className?: string;
};

const CARDS: Array<{
  key: keyof typeof VALUATION_LABELS;
  icon: typeof Wallet;
  money?: boolean;
}> = [
  { key: "inventoryValue", icon: Wallet, money: true },
  { key: "warehouseValue", icon: Warehouse, money: true },
  { key: "purchaseValue", icon: ShoppingBasket, money: true },
  { key: "salesValue", icon: ShoppingCart, money: true },
  { key: "currentAssetValue", icon: Landmark, money: true },
  { key: "averageCost", icon: Calculator, money: true },
];

/**
 * Shared live valuation strip — Dashboard, Warehouse, Analytics, Reports.
 */
export default function ValuationMetricsGrid({
  metrics,
  title = "بەهای ئینڤێنتۆری (زیندوو)",
  subtitle = "هەژمارکردن لە کۆگا × نرخ · Prisma",
  className = "",
}: Props) {
  return (
    <section className={`space-y-3 ${className}`}>
      {(title || subtitle) && (
        <div>
          {title ? (
            <h2 className="text-lg font-bold text-primary sm:text-xl">{title}</h2>
          ) : null}
          {subtitle ? (
            <p className="text-xs text-muted-foreground sm:text-sm">{subtitle}</p>
          ) : null}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {CARDS.map(({ key, icon: Icon }) => {
          const value = metrics[key];
          return (
            <article key={key} className="rek-stat-card">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-muted-foreground sm:text-sm">
                    {VALUATION_LABELS[key]}
                  </p>
                  <p className="mt-2 truncate text-xl font-black tracking-tight text-foreground sm:text-2xl">
                    {formatMoney(value)}
                  </p>
                </div>
                <div className="rek-stat-icon shrink-0">
                  <Icon size={20} aria-hidden />
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
