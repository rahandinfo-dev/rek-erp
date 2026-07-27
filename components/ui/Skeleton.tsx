"use client";

import { cn } from "@/lib/utils";
import { useT } from "@/components/i18n/LocaleProvider";

type SkeletonProps = React.ComponentProps<"div"> & {
  /** Soft shimmer vs plain pulse */
  shimmer?: boolean;
};

export function Skeleton({
  className,
  shimmer = true,
  ...props
}: SkeletonProps) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn(
        "rounded-2xl bg-muted",
        shimmer ? "rek-skeleton" : "animate-pulse",
        className
      )}
      {...props}
    />
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-2">
        <Skeleton className="h-9 w-48 sm:w-64" />
        <Skeleton className="h-4 w-64 sm:w-80" />
      </div>
      <Skeleton className="h-11 w-32" />
    </div>
  );
}

export function StatGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-28 rounded-3xl"
          style={{ animationDelay: `${i * 60}ms` }}
        />
      ))}
    </div>
  );
}

export function TableSkeleton({
  rows = 6,
  cols = 5,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="rek-table-shell">
      <div className="space-y-0 p-0">
        <div className="flex gap-3 border-b border-border bg-muted/50 px-4 py-3">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={r}
            className="flex gap-3 border-b border-border px-4 py-3.5 last:border-0"
          >
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton
                key={c}
                className="h-4 flex-1"
                style={{ animationDelay: `${(r * cols + c) * 40}ms` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardGridSkeleton({
  count = 8,
}: {
  count?: number;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 sm:gap-5 lg:grid-cols-3 2xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rek-card overflow-hidden p-0"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <Skeleton className="aspect-[4/3] rounded-none" />
          <div className="space-y-2 p-4">
            <Skeleton className="h-5 w-[75%]" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-8 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="rek-card space-y-6 p-5 sm:p-8">
      <Skeleton className="h-8 w-48" />
      <div className="rek-form-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-11 w-full" />
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-3">
        <Skeleton className="h-11 w-28" />
        <Skeleton className="h-11 w-32" />
      </div>
    </div>
  );
}

export function DashboardPageSkeleton() {
  const { t } = useT();
  return (
    <div
      className="rek-page-enter space-y-6"
      aria-busy="true"
      aria-label={t("common.loading")}
    >
      <PageHeaderSkeleton />
      <StatGridSkeleton />
      <div className="grid gap-4 xl:grid-cols-3">
        <Skeleton className="h-72 rounded-3xl xl:col-span-2" />
        <Skeleton className="h-72 rounded-3xl" />
      </div>
    </div>
  );
}

export function ListPageSkeleton({
  variant = "table",
}: {
  variant?: "table" | "cards" | "form";
}) {
  const { t } = useT();
  return (
    <div
      className="rek-page-enter space-y-6"
      aria-busy="true"
      aria-label={t("common.loading")}
    >
      <PageHeaderSkeleton />
      {variant === "table" ? <TableSkeleton /> : null}
      {variant === "cards" ? <CardGridSkeleton /> : null}
      {variant === "form" ? <FormSkeleton /> : null}
    </div>
  );
}
