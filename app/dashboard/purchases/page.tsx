import Link from "next/link";
import { Plus } from "lucide-react";
import PurchasesTable from "@/components/purchases/PurchasesTable";
import { getCurrentCompanyId } from "@/lib/auth/current-user";
import { db } from "@/lib/prisma/db";
import { tServer } from "@/lib/i18n";

export default async function PurchasesPage() {
  const companyId = await getCurrentCompanyId();
  if (!companyId) return null;

  const t = tServer.t.bind(tServer);

  const purchases = await db.purchase.findMany({
    where: { companyId, deletedAt: null },
    select: {
      id: true,
      invoiceNo: true,
      purchaseDate: true,
      status: true,
      total: true,
      supplier: { select: { name: true } },
      warehouse: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 250,
  });

  const initialData = purchases.map((p) => ({
    id: p.id,
    invoiceNo: p.invoiceNo,
    purchaseDate: p.purchaseDate.toISOString(),
    status: p.status,
    total: Number(p.total),
    supplier: p.supplier,
    warehouse: p.warehouse,
  }));

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-[#FFAE42] sm:text-4xl">
            {t("purchases.title")}
          </h1>
          <p className="mt-2 text-slate-500">{t("purchases.description")}</p>
        </div>

        <Link
          href="/dashboard/purchases/new"
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#FFAE42] px-5 py-3 font-bold text-white transition hover:bg-[#E8942A]"
        >
          <Plus size={20} />
          {t("purchases.new")}
        </Link>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-8">
        <PurchasesTable initialData={initialData} />
      </div>
    </div>
  );
}
