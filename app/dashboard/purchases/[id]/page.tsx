import { formatDate } from "@/lib/utils/datetime";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { notFound } from "next/navigation";
import { db } from "@/lib/prisma/db";
import { getCurrentCompanyId } from "@/lib/auth/current-user";
import { formatMoney } from "@/lib/utils/format";
import RecordVersionHistorySection from "@/components/versions/RecordVersionHistorySection";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function PurchaseDetailPage({ params }: Props) {
  const companyId = await getCurrentCompanyId();
  if (!companyId) return null;

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
          <p className="mt-2 text-slate-500">وردەکاری کڕین</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border bg-white p-6 lg:col-span-1">
          <h2 className="mb-4 text-xl font-bold text-[#FFAE42]">زانیاری</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">دابینکەر</dt>
              <dd className="font-semibold">{purchase.supplier.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">کۆگا</dt>
              <dd className="font-semibold">{purchase.warehouse.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">بەروار</dt>
              <dd className="font-semibold">
                {formatDate(purchase.purchaseDate)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">دۆخ</dt>
              <dd className="font-semibold">{purchase.status}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">کۆی گشتی</dt>
              <dd className="font-bold text-[#FFAE42]">
                {formatMoney(purchase.total)} IQD
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-3xl border bg-white p-4 sm:p-6 lg:col-span-2">
          <h2 className="mb-4 text-xl font-bold text-[#FFAE42]">بەرهەمەکان</h2>
          <div className="rek-table-shell">
            <div className="rek-table-wrap">
              <table className="w-full min-w-[420px] sm:min-w-[520px]">
              <thead className="bg-slate-50">
                <tr className="text-right">
                  <th className="px-4 py-3">بەرهەم</th>
                  <th className="px-4 py-3">بڕ</th>
                  <th className="px-4 py-3">نرخ</th>
                  <th className="px-4 py-3">کۆ</th>
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
                      {formatMoney(item.unitPrice)} IQD
                    </td>
                    <td className="px-4 py-3">{formatMoney(item.total)} IQD</td>
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
