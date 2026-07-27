"use client";

import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  startTransition,
} from "react";
import Link from "next/link";
import { Package, Plus, Search } from "lucide-react";
import ProductGrid from "@/components/products/ProductGrid";
import type { ProductCardData } from "@/components/products/ProductCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { CardGridSkeleton } from "@/components/ui/Skeleton";
import { apiFetch, getErrorMessage } from "@/lib/api/client";
import { appToast } from "@/lib/toast";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { Button } from "@/components/ui/button";
import BulkListShell from "@/components/bulk/BulkListShell";
import { useT } from "@/components/i18n/LocaleProvider";

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type Props = {
  initialProducts?: ProductCardData[];
  initialPagination?: Pagination;
};

function ProductsBrowser({
  initialProducts = [],
  initialPagination,
}: Props) {
  const { t } = useT();
  const [products, setProducts] = useState<ProductCardData[]>(initialProducts);
  const [loading, setLoading] = useState(initialProducts.length === 0);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 280);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination>(
    initialPagination ?? {
      page: 1,
      pageSize: 12,
      total: 0,
      totalPages: 1,
    }
  );
  const skipFirstFetch = useRef(
    initialProducts.length > 0 && !debouncedSearch.trim()
  );
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (skipFirstFetch.current && page === 1 && !debouncedSearch.trim()) {
      skipFirstFetch.current = false;
      return;
    }
    skipFirstFetch.current = false;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const shouldShowSkeleton = products.length === 0;
    const timeoutId = window.setTimeout(() => {
      if (!controller.signal.aborted && shouldShowSkeleton) {
        setLoading(true);
      }
    }, 0);

    void (async () => {
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: "12",
        });
        if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim());

        const data = await apiFetch<ProductCardData[]>(
          `/api/products?${params.toString()}`,
          { signal: controller.signal }
        );
        if (controller.signal.aborted) return;

        startTransition(() => {
          setProducts((data.data as ProductCardData[]) || []);
          if (data.pagination) {
            setPagination(data.pagination as Pagination);
          }
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        appToast.error(t("products.loadFailed"), getErrorMessage(error));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
    // products.length intentionally omitted — only gate initial skeleton
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stale-while-revalidate
  }, [page, debouncedSearch]);

  const onUpdated = useCallback((next: ProductCardData) => {
    setProducts((prev) => {
      if (prev.some((p) => p.id === next.id)) {
        return prev.map((p) => (p.id === next.id ? { ...p, ...next } : p));
      }
      return [next, ...prev];
    });
  }, []);

  const onDeleted = useCallback((id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setPagination((prev) => ({
      ...prev,
      total: Math.max(0, prev.total - 1),
    }));
  }, []);

  const searching = search.trim().length > 0;
  const showSkeleton = loading && products.length === 0;

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title={t("products.title")}
        description={t("products.description")}
        breadcrumb={[
          { label: t("nav.dashboard"), href: "/dashboard" },
          { label: t("nav.products") },
        ]}
        actions={
          <Link
            href="/dashboard/products/new"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-5 font-bold text-primary-foreground shadow-[0_6px_16px_var(--shadow-brand)] transition hover:bg-[var(--brand-hover)] active:scale-[0.98]"
          >
            <Plus size={20} aria-hidden />
            {t("products.new")}
          </Link>
        }
      />

      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-muted-foreground"
          size={18}
          aria-hidden
        />
        <input
          type="search"
          placeholder={t("products.searchPlaceholder")}
          value={search}
          onChange={(e) => {
            const value = e.target.value;
            setSearch(value);
            setPage(1);
          }}
          aria-label={t("products.searchAria")}
          className="w-full rounded-2xl border border-border bg-card py-3 pr-12 pl-4 text-foreground shadow-[var(--shadow-xs)] outline-none transition focus:border-primary/50 focus-visible:ring-[3px] focus-visible:ring-ring/35"
        />
      </div>

      <p className="text-sm font-bold text-muted-foreground" aria-live="polite">
        <Package size={14} className="ml-1 inline text-primary" aria-hidden />
        {t("common.productsCount", { count: String(pagination.total) })}
        {loading && products.length > 0 ? t("products.refreshing") : ""}
      </p>

      {showSkeleton ? (
        <CardGridSkeleton count={8} />
      ) : products.length === 0 ? (
        <EmptyState
          icon={Package}
          title={
            searching ? t("products.notFound") : t("products.empty")
          }
          description={
            searching
              ? t("products.emptySearchHint")
              : t("products.emptyHint")
          }
          action={
            !searching ? (
              <Link
                href="/dashboard/products/new"
                className="inline-flex h-11 items-center gap-2 rounded-2xl bg-primary px-6 font-bold text-primary-foreground transition hover:bg-[var(--brand-hover)]"
              >
                <Plus size={20} aria-hidden />
                {t("products.addFirst")}
              </Link>
            ) : null
          }
        />
      ) : (
        <BulkListShell
          moduleKey="products"
          ids={products.map((p) => p.id)}
          labels={Object.fromEntries(products.map((p) => [p.id, p.name]))}
        >
          {({ isSelected, toggle }) => (
            <>
              <div
                className={
                  loading
                    ? "pointer-events-none opacity-70 transition-opacity"
                    : ""
                }
              >
                <ProductGrid
                  products={products}
                  onUpdated={onUpdated}
                  onDeleted={onDeleted}
                  isSelected={isSelected}
                  onToggleSelect={toggle}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-xs)]">
                <p className="text-sm text-muted-foreground" aria-live="polite">
                  {t("common.pagination", { total: String(pagination.total), page: String(pagination.page), totalPages: String(pagination.totalPages) })}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page <= 1 || loading}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="shadow-none"
                  >{t("common.prevPage")}</Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page >= pagination.totalPages || loading}
                    onClick={() => setPage((p) => p + 1)}
                    className="shadow-none"
                  >{t("common.nextPage")}</Button>
                </div>
              </div>
            </>
          )}
        </BulkListShell>
      )}
    </div>
  );
}

export default memo(ProductsBrowser);
