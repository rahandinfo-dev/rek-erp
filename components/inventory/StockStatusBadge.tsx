import { cn } from "@/lib/utils";
import {
  STOCK_STATUS_LABELS_KU,
  type StockStatus,
  stockStatusBadgeClass,
} from "@/lib/inventory/stock";

type Props = {
  status: StockStatus;
  className?: string;
  /** Larger badge for cards / hero */
  size?: "sm" | "md" | "lg";
};

/**
 * Auto stock status badge — never editable.
 * Green Available · Orange Low · Red Out
 */
export function StockStatusBadge({
  status,
  className,
  size = "md",
}: Props) {
  return (
    <span
      className={cn(
        stockStatusBadgeClass(status),
        "inline-flex items-center gap-1.5 font-black tracking-wide",
        size === "sm" && "px-2 py-0.5 text-[10px]",
        size === "md" && "px-2.5 py-1 text-xs",
        size === "lg" && "px-3.5 py-1.5 text-sm",
        className
      )}
    >
      <span
        className="size-1.5 shrink-0 rounded-full bg-white/95"
        aria-hidden
      />
      {STOCK_STATUS_LABELS_KU[status]}
    </span>
  );
}
