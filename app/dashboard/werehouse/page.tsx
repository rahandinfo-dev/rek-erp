import Link from "next/link";
import { Plus } from "lucide-react";
import { db } from "@/lib/prisma/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import WerehouseTable from "@/components/werehouse/WerehouseTable";
import WerehouseSearch from "@/components/werehouse/WerehouseSearch";
import { ensureCompanyWarehouseBalances } from "@/lib/inventory/movements";
import { buildAllWarehouseValuations } from "@/lib/inventory/valuation";
import { getCachedInventorySummary } from "@/lib/cache/company-reads";
import { LowStockWarningBanner } from "@/components/inventory/LowStockWarningBanner";
import { PageHeader } from "@/components/ui/PageHeader";
import { tServer } from "@/lib/i18n";

export default async function WarehousesPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    filter?: string;
  }>;
}) {
  const t = tServer.t;
  const user = await getCurrentUser();
  if (!user) return null;

  const { search = "" } = await searchParams;

  await db.$transaction(async (tx) => {
    await ensureCompanyWarehouseBalances(tx, user.companyId);
  });

  const [warehouses, valuations, summary] = await Promise.all([
    db.warehouse.findMany({
      where: {
        companyId: user.companyId,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" as const } },
                { code: { contains: search, mode: "insensitive" as const } },
              ],
            }
          : {}),
      },
      orderBy: [{ isMain: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        code: true,
        address: true,
        isMain: true,
        capacity: true,
      },
    }),
    buildAllWarehouseValuations(user.companyId),
    getCachedInventorySummary(user.companyId),
  ]);

  const valuationById = new Map(valuations.map((v) => [v.warehouseId, v]));

  const rows = warehouses.map((w) => {
    const v = valuationById.get(w.id);
    return {
      id: w.id,
      name: w.name,
      code: w.code,
      address: w.address,
      isMain: w.isMain,
      capacity: w.capacity != null ? Number(w.capacity) : null,
      capacityPct: v?.capacityPct ?? null,
      inventoryValue: v?.inventoryValue ?? 0,
      purchaseValue: v?.purchaseValue ?? 0,
      salesValue: v?.salesValue ?? 0,
      averageCost: v?.averageCost ?? 0,
      currentAssetValue: v?.currentAssetValue ?? 0,
      availableStock: v?.availableUnits ?? 0,
      lowStockCount: v?.lowStockCount ?? 0,
      outOfStockCount: v?.outOfStockCount ?? 0,
      inventoryHealthScore: v?.inventoryHealthScore ?? 100,
      productsCount: v?.productsCount ?? 0,
      usedUnits: v?.usedUnits ?? 0,
    };
  });

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title={t("warehouses.title")}
        description={t("warehouses.description")}
        breadcrumb={[
          { label: t("nav.dashboard"), href: "/dashboard" },
          { label: t("warehouses.title") },
        ]}
        actions={
          <Link
            href="/dashboard/werehouse/new"
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-primary px-5 font-bold text-primary-foreground"
          >
            <Plus size={18} aria-hidden />
            {t("warehouses.new")}
          </Link>
        }
      />

      <WerehouseSearch />

      <LowStockWarningBanner
        lowStockCount={summary.lowStockCount}
        outOfStockCount={summary.outOfStockCount}
        href="/dashboard/inventory?status=low"
      />

      {rows.length === 0 ? (
        <div className="rek-card p-10 text-center">
          <h2 className="text-xl font-black">{t("warehouses.emptyTitle")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("warehouses.emptyBody")}
          </p>
          <Link
            href="/dashboard/werehouse/new"
            className="mt-5 inline-flex h-11 items-center rounded-2xl bg-primary px-6 font-bold text-primary-foreground"
          >
            {t("warehouses.create")}
          </Link>
        </div>
      ) : (
        <WerehouseTable werehouses={rows} />
      )}
    </div>
  );
}
