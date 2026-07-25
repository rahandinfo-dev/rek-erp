import dynamic from "next/dynamic";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  loadInventoryFilterOptions,
  queryInventory,
} from "@/lib/inventory/query";
import { ensureCompanyWarehouseBalances } from "@/lib/inventory/movements";
import { loadStockAlertProducts } from "@/lib/inventory/alerts";
import { db } from "@/lib/prisma/db";
import type { InventoryStatusFilter } from "@/lib/inventory/types";
import { StockAlertBanners } from "@/components/inventory/StockAlertBanners";
import { LowStockWarningBanner } from "@/components/inventory/LowStockWarningBanner";

const InventoryBrowser = dynamic(
  () => import("@/components/inventory/InventoryBrowser"),
  {
    loading: () => (
      <div className="space-y-5">
        <div className="h-16 animate-pulse rounded-3xl bg-muted" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
        <div className="h-40 animate-pulse rounded-3xl bg-muted" />
        <div className="h-72 animate-pulse rounded-3xl bg-muted" />
      </div>
    ),
  }
);

function parseStatus(raw?: string): InventoryStatusFilter {
  if (raw === "low" || raw === "out" || raw === "available") return raw;
  return "all";
}

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const companyId = user.companyId;
  const { status: statusParam } = await searchParams;
  const status = parseStatus(statusParam);

  await db.$transaction(async (tx) => {
    await ensureCompanyWarehouseBalances(tx, companyId);
  });

  const [filterOptions, initial, alertProducts] = await Promise.all([
    loadInventoryFilterOptions(companyId),
    queryInventory({
      companyId,
      sort: "newest",
      page: 1,
      pageSize: 20,
      status,
    }),
    loadStockAlertProducts(companyId, 15),
  ]);

  return (
    <div className="space-y-5">
      <LowStockWarningBanner
        lowStockCount={initial.summary.lowStockCount}
        outOfStockCount={initial.summary.outOfStockCount}
        href={null}
      />
      <StockAlertBanners products={alertProducts} />
      <InventoryBrowser
        units={filterOptions.units}
        warehouses={filterOptions.warehouses}
        initialSummary={initial.summary}
        initialProducts={initial.products}
        initialMovements={initial.movements}
        initialPagination={initial.pagination}
        initialStatus={status}
      />
    </div>
  );
}
