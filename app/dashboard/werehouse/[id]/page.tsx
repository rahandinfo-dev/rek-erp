import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { db } from "@/lib/prisma/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import EditWerehouseForm from "@/components/werehouse/EditWerehouseForm";
import ValuationMetricsGrid from "@/components/inventory/ValuationMetricsGrid";
import { buildWarehouseValuation } from "@/lib/inventory/valuation";
import { toValuationMetrics } from "@/lib/inventory/valuationMetrics";
import RecordVersionHistorySection from "@/components/versions/RecordVersionHistorySection";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditWerehousePage({ params }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    notFound();
  }

  const { id } = await params;

  const [werehouse, valuation] = await Promise.all([
    db.warehouse.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
    }),
    buildWarehouseValuation(user.companyId, id),
  ]);

  if (!werehouse) {
    notFound();
  }

  const metrics = toValuationMetrics(
    valuation ?? {
      inventoryValue: 0,
      purchaseValue: 0,
      salesValue: 0,
      averageCost: 0,
      currentAssetValue: 0,
      totalUnits: 0,
      productsCount: 0,
    }
  );

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Link
          href="/dashboard/werehouse"
          className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-muted-foreground transition hover:bg-muted"
        >
          <ArrowRight size={18} />
          گەڕانەوە بۆ کۆگاکان
        </Link>

        <div>
          <h1 className="text-4xl font-black text-primary">
            دەستکاریکردنی کۆگا
          </h1>
          <p className="mt-2 text-muted-foreground">
            زانیارییەکانی کۆگا دەستکاری بکە · بەهاکان خۆکار هەژمار دەکرێن
          </p>
        </div>
      </div>

      <ValuationMetricsGrid
        metrics={metrics}
        title={`بەهاکانی ${werehouse.name}`}
        subtitle={
          valuation
            ? `تەندروستی ${valuation.inventoryHealthScore}% · ${valuation.productsCount} بەرهەم`
            : undefined
        }
      />

      <EditWerehouseForm werehouse={werehouse} />

      <RecordVersionHistorySection
        entityType="Warehouse"
        entityId={werehouse.id}
        recordLabel={werehouse.name}
      />
    </div>
  );
}
