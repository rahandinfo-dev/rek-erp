import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/prisma/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { formatMoney } from "@/lib/utils/format";
import { PAYMENT_METHOD_LABELS } from "@/lib/invoices/payment";
import RecordVersionHistorySection from "@/components/versions/RecordVersionHistorySection";
import { tServer } from "@/lib/i18n";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function SaleDetailPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) return null;

  const t = tServer.t.bind(tServer);
  const { id } = await params;

  const sale = await db.sale.findFirst({
    where: { id, companyId: user.companyId, deletedAt: null },
    include: {
      customer: true,
      warehouse: true,
      invoice: { select: { id: true, invoiceNo: true, status: true } },
      items: {
        include: {
          product: { select: { name: true, sku: true } },
        },
      },
    },
  });

  if (!sale) notFound();

  if (sale.invoice) {
    redirect(`/dashboard/invoices/${sale.invoice.id}`);
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/sales"
          className="rounded-xl border p-2 text-slate-600 hover:bg-slate-50"
        >
          <ArrowRight size={20} />
        </Link>
        <div>
          <h1 className="text-3xl font-black text-[#FFAE42] sm:text-4xl">
            {sale.invoiceNo}
          </h1>
          <p className="mt-2 text-slate-500">
            {sale.customer.name} · {formatMoney(sale.total)} ·{" "}
            {PAYMENT_METHOD_LABELS[sale.paymentMethod]}
          </p>
        </div>
      </div>

      <div className="rek-card p-6 text-center">
        <FileText className="mx-auto text-[#FFAE42]/40" size={36} />
        <p className="mt-3 font-bold text-slate-700">
          {t("sales.noInvoiceTitle")}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {t("sales.noInvoiceBody")}
        </p>
        <Link
          href="/dashboard/invoices"
          className="mt-5 inline-flex rounded-2xl bg-[#FFAE42] px-5 py-3 font-bold text-white"
        >
          {t("nav.invoices")}
        </Link>
      </div>

      <RecordVersionHistorySection
        entityType="Sale"
        entityId={sale.id}
        recordLabel={sale.invoiceNo}
      />
    </div>
  );
}
