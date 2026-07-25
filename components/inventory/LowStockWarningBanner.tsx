import Link from "next/link";
import { AlertTriangle, PackageX } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  lowStockCount: number;
  outOfStockCount: number;
  href?: string | null;
  onActivate?: () => void;
  className?: string;
};

/**
 * Prominent warehouse warning — Dashboard / Analytics / Warehouse / Inventory.
 */
export function LowStockWarningBanner({
  lowStockCount,
  outOfStockCount,
  href = "/dashboard/inventory?status=low",
  onActivate,
  className,
}: Props) {
  const total = lowStockCount + outOfStockCount;
  if (total <= 0) return null;

  const toneOut = outOfStockCount > 0;
  const classNames = cn(
    "rek-low-stock-banner flex w-full items-start gap-3 rounded-3xl border px-4 py-4 text-right transition hover:brightness-[0.98] sm:items-center sm:px-5",
    toneOut
      ? "border-red-200 bg-red-50 text-red-800"
      : "border-orange-200 bg-orange-50 text-orange-900",
    className
  );

  const body = (
    <>
      <span
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-2xl text-white",
          toneOut ? "bg-red-600" : "bg-orange-500"
        )}
      >
        {toneOut ? (
          <PackageX size={22} aria-hidden />
        ) : (
          <AlertTriangle size={22} aria-hidden />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-base font-black sm:text-lg">
          {toneOut
            ? `${outOfStockCount} بەرهەم تەواو بووە`
            : `${lowStockCount} بەرهەم کۆگای کەمە`}
        </p>
        <p className="mt-0.5 text-sm opacity-90">
          {lowStockCount > 0 && outOfStockCount > 0
            ? `${lowStockCount} کۆگای کەم · ${outOfStockCount} تەواو`
            : "پێویستە کۆگا زیاد بکرێت پێش ئەوەی فرۆشتن بوەستێت"}
        </p>
      </div>
    </>
  );

  if (onActivate) {
    return (
      <button type="button" onClick={onActivate} className={classNames}>
        {body}
      </button>
    );
  }

  if (href) {
    return (
      <Link href={href} className={classNames}>
        {body}
      </Link>
    );
  }

  return <div className={classNames}>{body}</div>;
}
