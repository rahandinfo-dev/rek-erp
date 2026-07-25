"use client";

import {
  Boxes,
  DollarSign,
  Package,
  ShoppingBasket,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react";
import AnimatedNumber from "@/components/dashboard/AnimatedNumber";
import { formatMoney , formatNumber} from "@/lib/utils/format";
import { cn } from "@/lib/utils";

export type DashboardStatTone =
  | "brand"
  | "blue"
  | "emerald"
  | "amber"
  | "violet"
  | "cyan"
  | "rose"
  | "slate";

export type DashboardStatIconName =
  | "package"
  | "users"
  | "truck"
  | "boxes"
  | "shoppingCart"
  | "shoppingBasket"
  | "dollarSign"
  | "trendingDown";

const ICONS: Record<DashboardStatIconName, LucideIcon> = {
  package: Package,
  users: Users,
  truck: Truck,
  boxes: Boxes,
  shoppingCart: ShoppingCart,
  shoppingBasket: ShoppingBasket,
  dollarSign: DollarSign,
  trendingDown: TrendingDown,
};

type Props = {
  title: string;
  value: number;
  iconName: DashboardStatIconName;
  /** @deprecated Ignored — all cards share one design. */
  tone?: DashboardStatTone;
  money?: boolean;
  todayChange: number;
  todayLabel?: string;
};

export default function DashboardStatCard({
  title,
  value,
  iconName,
  money = false,
  todayChange,
  todayLabel = "ئەمڕۆ",
}: Props) {
  const Icon = ICONS[iconName];
  const isUp = todayChange > 0;
  const isDown = todayChange < 0;
  const showChange = todayLabel !== "" || todayChange !== 0;

  const changeText = money
    ? `${isUp ? "+" : isDown ? "-" : ""}${formatMoney(Math.abs(todayChange))} IQD`
    : `${isUp ? "+" : isDown ? "-" : ""}${formatNumber(Math.abs(todayChange))}`;

  return (
    <article className="rek-stat-card group">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-muted-foreground">{title}</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-foreground sm:text-[1.75rem]">
            <AnimatedNumber
              value={value}
              format={(n) =>
                money
                  ? `${formatMoney(n)} IQD`
                  : formatNumber(Math.round(n))
              }
            />
          </h2>
        </div>

        <div className="rek-stat-icon size-11 sm:size-12">
          <Icon size={22} aria-hidden />
        </div>
      </div>

      {showChange ? (
        <div
          className={cn(
            "mt-4 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold",
            isUp
              ? "bg-emerald-50 text-emerald-700"
              : isDown
                ? "bg-red-50 text-red-700"
                : "bg-muted text-muted-foreground"
          )}
        >
          {isUp ? (
            <TrendingUp size={13} aria-hidden />
          ) : isDown ? (
            <TrendingDown size={13} aria-hidden />
          ) : null}
          <span>
            {todayChange !== 0 ? changeText : null}
            {todayLabel ? ` ${todayLabel}` : ""}
          </span>
        </div>
      ) : null}
    </article>
  );
}
