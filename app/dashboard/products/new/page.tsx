import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { redirect } from "next/navigation";
import ProductForm from "@/components/products/ProductForm";
import { getCurrentCompanyId } from "@/lib/auth/current-user";
import { ensureDefaultUnits } from "@/lib/units/defaults";
import { db } from "@/lib/prisma/db";
import { PageHeader } from "@/components/ui/PageHeader";

type Props = {
  searchParams: Promise<{ barcode?: string }>;
};

export default async function NewProductPage({ searchParams }: Props) {
  const companyId = await getCurrentCompanyId();
  if (!companyId) redirect("/login");

  const params = await searchParams;
  const initialBarcode = (params.barcode || "").trim();

  const [units, warehouses] = await Promise.all([
    ensureDefaultUnits(companyId),
    db.warehouse.findMany({
      where: { companyId },
      select: { id: true, name: true, isMain: true },
      orderBy: [{ isMain: "desc" }, { name: "asc" }],
    }),
  ]);

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="بەرهەمی نوێ"
        description="زانیاری سادە بنووسە — SKU و بارکۆد خۆکار دروست دەبن."
        breadcrumb={[
          { label: "داشبۆرد", href: "/dashboard" },
          { label: "بەرهەمەکان", href: "/dashboard/products" },
          { label: "نوێ" },
        ]}
        actions={
          <Link
            href="/dashboard/products"
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-border bg-card px-4 text-sm font-bold"
          >
            <ArrowRight size={16} aria-hidden />
            گەڕانەوە
          </Link>
        }
      />

      {initialBarcode ? (
        <p className="rounded-2xl border border-border bg-muted/50 px-4 py-2 text-sm text-muted-foreground">
          بارکۆدی پێشوەختە:{" "}
          <span className="font-mono font-bold text-foreground">
            {initialBarcode}
          </span>
        </p>
      ) : null}

      <ProductForm
        initialBarcode={initialBarcode}
        initialUnits={units}
        initialWarehouses={warehouses}
      />
    </div>
  );
}
