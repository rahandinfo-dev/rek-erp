import { formatDate } from "@/lib/utils/datetime";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { notFound } from "next/navigation";
import { db } from "@/lib/prisma/db";
import { getCurrentCompanyId } from "@/lib/auth/current-user";
import { formatMoney } from "@/lib/utils/format";
import RecordVersionHistorySection from "@/components/versions/RecordVersionHistorySection";
import { tServer } from "@/lib/i18n";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function PurchaseDetailPage({ params }: Props) {
  const companyId = await getCurrentCompanyId();
  if (!companyId) return null;

  const t = tServer.t.bind(tServer);
  const { id } = await params;

  const purchase = await db.purchase.findFirst({
    where: { id, companyId },
    include: {
      supplier: true,
      warehouse: true,
      items: {
        include: {
          product: { select: { name: true, sku: true } },
        },
      },
    },
  });

  if (!purchase) notFound();

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/purchases"
          className="rounded-xl border p-2 text-slate-600 hover:bg-slate-50"
        >
          <ArrowRight size={20} />
        </Link>
        <div>
          <h1 className="text-3xl font-black text-[#FFAE42] sm:text-4xl">
            {purchase.invoiceNo}
          </h1>
          <p className="mt-2 text-slate-500">{t("purchases.details")}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border bg-white p-6 lg:col-span-1">
          <h2 className="mb-4 text-xl font-bold text-[#FFAE42]">
            {t("common.info")}
          </h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">{t("purchases.supplierOptional")}</dt>
              <dd className="font-semibold">{purchase.supplier.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">{t("common.warehouse")}</dt>
              <dd className="font-semibold">{purchase.warehouse.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">{t("common.date")}</dt>
              <dd className="font-semibold">
                {formatDate(purchase.purchaseDate)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">{t("common.status")}</dt>
              <dd className="font-semibold">{purchase.status}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">{t("common.total")}</dt>
              <dd className="font-bold text-[#FFAE42]">
                {formatMoney(purchase.total)}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-3xl border bg-white p-4 sm:p-6 lg:col-span-2">
          <h2 className="mb-4 text-xl font-bold text-[#FFAE42]">
            {t("common.products")}
          </h2>
          <div className="rek-table-shell">
            <div className="rek-table-wrap">
              <table className="w-full min-w-[420px] sm:min-w-[520px]">
              <thead className="bg-slate-50">
                <tr className="text-right">
                  <th className="px-4 py-3">{t("common.product")}</th>
                  <th className="px-4 py-3">{t("common.quantity")}</th>
                  <th className="px-4 py-3">{t("common.price")}</th>
                  <th className="px-4 py-3">{t("common.lineTotal")}</th>
                </tr>
              </thead>
              <tbody>
                {purchase.items.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="max-w-[12rem] truncate px-4 py-3 sm:max-w-none">
                      {item.product.name}
                      <span className="block text-xs text-slate-400">
                        {item.product.sku}
                      </span>
                    </td>
                    <td className="px-4 py-3">{Number(item.quantity)}</td>
                    <td className="px-4 py-3">
                      {formatMoney(item.unitPrice)}
                    </td>
                    <td className="px-4 py-3">
                      {formatMoney(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      </div>

      <RecordVersionHistorySection
        entityType="Purchase"
        entityId={purchase.id}
        recordLabel={purchase.invoiceNo}
      />
    </div>
  );
}
