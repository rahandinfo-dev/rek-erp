"use client";
import { formatNumber } from "@/lib/utils/format";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Boxes, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import InventoryStats from "@/components/inventory/InventoryStats";
import InventoryFilters from "@/components/inventory/InventoryFilters";
import InventoryStockList from "@/components/inventory/InventoryStockList";
import { LowStockWarningBanner } from "@/components/inventory/LowStockWarningBanner";
import type {
  InventoryMovementRow,
  InventoryProductRow,
  InventorySort,
  InventoryStatusFilter,
  InventorySummary,
} from "@/lib/inventory/types";
import type { InventoryFilterOption } from "@/components/inventory/InventoryFilters";

const InventoryMovements = dynamic(
  () => import("@/components/inventory/InventoryMovements"),
  {
    loading: () => (
      <div className="h-48 animate-pulse rounded-3xl bg-muted" aria-hidden />
    ),
  }
);

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type Props = {
  units: InventoryFilterOption[];
  warehouses: InventoryFilterOption[];
  initialSummary: InventorySummary;
  initialProducts: InventoryProductRow[];
  initialMovements: InventoryMovementRow[];
  initialPagination: Pagination;
  initialStatus?: InventoryStatusFilter;
};

const EMPTY_SUMMARY: InventorySummary = {
  productsCount: 0,
  availableCount: 0,
  lowStockCount: 0,
  outOfStockCount: 0,
  totalCurrent: 0,
  totalAvailable: 0,
  totalReserved: 0,
};

export default function InventoryBrowser({
  units,
  warehouses,
  initialSummary,
  initialProducts,
  initialMovements,
  initialPagination,
  initialStatus = "all",
}: Props) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<InventoryStatusFilter>(initialStatus);
  const [warehouseId, setWarehouseId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [sort, setSort] = useState<InventorySort>("newest");
  const [page, setPage] = useState(1);

  const [products, setProducts] =
    useState<InventoryProductRow[]>(initialProducts);
  const [movements, setMovements] =
    useState<InventoryMovementRow[]>(initialMovements);
  const [summary, setSummary] = useState(initialSummary);
  const [pagination, setPagination] = useState(initialPagination);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();
  const skipFirstFetch = useRef(true);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(initialPagination.pageSize || 20),
        status,
        sort,
      });
      if (q.trim()) params.set("q", q.trim());
      if (warehouseId) params.set("warehouseId", warehouseId);
      if (unitId) params.set("unitId", unitId);

      const res = await fetch(`/api/inventory?${params.toString()}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!json.success || !json.data) return;

      startTransition(() => {
        setProducts(json.data.products);
        setMovements(json.data.movements);
        setSummary(json.data.summary || EMPTY_SUMMARY);
        setPagination(json.data.pagination);
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [
    page,
    q,
    status,
    warehouseId,
    unitId,
    sort,
    initialPagination.pageSize,
  ]);

  useEffect(() => {
    if (skipFirstFetch.current) {
      skipFirstFetch.current = false;
      return;
    }

    const t = window.setTimeout(() => {
      void fetchInventory();
    }, 280);
    return () => window.clearTimeout(t);
  }, [fetchInventory]);

  function onFilterChange(patch: {
    q?: string;
    status?: InventoryStatusFilter;
    warehouseId?: string;
    unitId?: string;
    sort?: InventorySort;
  }) {
    if (patch.q !== undefined) setQ(patch.q);
    if (patch.status !== undefined) setStatus(patch.status);
    if (patch.warehouseId !== undefined) setWarehouseId(patch.warehouseId);
    if (patch.unitId !== undefined) setUnitId(patch.unitId);
    if (patch.sort !== undefined) setSort(patch.sort);
    setPage(1);
  }

  const busy = loading || pending;

  return (
    <div className="w-full min-w-0 space-y-5 sm:space-y-7">
      <LowStockWarningBanner
        lowStockCount={summary.lowStockCount}
        outOfStockCount={summary.outOfStockCount}
        href={null}
        onActivate={() => {
          setStatus(summary.outOfStockCount > 0 ? "out" : "low");
          setPage(1);
        }}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 inline-flex items-center gap-2 rounded-2xl bg-secondary px-3 py-1 text-sm font-bold text-primary">
            <Boxes size={16} />
            {formatNumber(pagination.total)} ئەنجام
          </div>
          <h1 className="text-3xl font-black text-primary sm:text-4xl">
            ئینڤێنتۆری
          </h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            کۆگا، یەکە، نرخ و دۆخی کۆگا — داتای ڕاستەقینەی Prisma
          </p>
        </div>

        <Link
          href="/dashboard/products/new"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 font-bold text-primary-foreground shadow-lg shadow-primary/20"
        >
          <Plus size={18} />
          بەرهەمی نوێ
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/dashboard/inventory/adjustments"
          className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-bold text-primary"
        >
          ڕێکخستنی کۆگا
        </Link>
        <Link
          href="/dashboard/inventory/transfers"
          className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-bold text-primary"
        >
          گواستنەوەی کۆگا
        </Link>
        <Link
          href="/dashboard/inventory/history"
          className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-bold text-primary"
        >
          مێژووی جوڵەکان
        </Link>
        <Link
          href="/dashboard/werehouse"
          className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-bold text-primary"
        >
          داشبۆردی کۆگا
        </Link>
      </div>

      <InventoryStats summary={summary} />

      <InventoryFilters
        q={q}
        status={status}
        warehouseId={warehouseId}
        unitId={unitId}
        sort={sort}
        units={units}
        warehouses={warehouses}
        onChange={onFilterChange}
      />

      {(summary.lowStockCount > 0 || summary.outOfStockCount > 0) &&
      status === "all" ? (
        <div className="flex flex-wrap gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900 sm:px-4">
          {summary.lowStockCount > 0 ? (
            <button
              type="button"
              onClick={() => onFilterChange({ status: "low" })}
              className="rounded-full bg-white px-3 py-1 font-semibold hover:bg-amber-100"
            >
              {summary.lowStockCount} کۆگای کەم →
            </button>
          ) : null}
          {summary.outOfStockCount > 0 ? (
            <button
              type="button"
              onClick={() => onFilterChange({ status: "out" })}
              className="rounded-full bg-white px-3 py-1 font-semibold hover:bg-rose-50"
            >
              {summary.outOfStockCount} تەواو →
            </button>
          ) : null}
        </div>
      ) : null}

      <section className="min-w-0 space-y-3">
        <div className="flex items-end justify-between gap-2">
          <h2 className="text-lg font-bold text-primary sm:text-xl">
            ئاستی کۆگا
          </h2>
          {busy ? (
            <span className="text-xs text-muted-foreground">نوێکردنەوە...</span>
          ) : null}
        </div>
        <InventoryStockList
          products={products}
          loading={busy && products.length === 0}
        />
      </section>

      {pagination.totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            disabled={page <= 1 || busy}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="inline-flex h-10 items-center gap-1 rounded-xl border border-border bg-card px-3 text-sm font-semibold disabled:opacity-40"
          >
            <ChevronRight size={16} />
            پێشوو
          </button>
          <span className="text-sm text-muted-foreground">
            {pagination.page} / {pagination.totalPages}
          </span>
          <button
            type="button"
            disabled={page >= pagination.totalPages || busy}
            onClick={() =>
              setPage((p) => Math.min(pagination.totalPages, p + 1))
            }
            className="inline-flex h-10 items-center gap-1 rounded-xl border border-border bg-card px-3 text-sm font-semibold disabled:opacity-40"
          >
            داهاتوو
            <ChevronLeft size={16} />
          </button>
        </div>
      ) : null}

      <InventoryMovements movements={movements} />
    </div>
  );
}
