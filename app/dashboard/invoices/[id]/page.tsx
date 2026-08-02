import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { notFound } from "next/navigation";
import { db } from "@/lib/prisma/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  DEFAULT_INVOICE_CONFIG,
  type InvoiceTemplateConfig,
  type InvoiceSizeOption,
} from "@/lib/invoices/template-config";
import { mapInvoiceToPreview } from "@/lib/invoices/map-preview";
import { PAYMENT_METHOD_LABELS } from "@/lib/invoices/payment";
import { formatMoney } from "@/lib/utils/format";
import InvoiceViewer from "@/components/invoices/InvoiceViewer";
import RecordVersionHistorySection from "@/components/versions/RecordVersionHistorySection";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ print?: string; pdf?: string }>;
};

export default async function InvoiceDetailPage({
  params,
  searchParams,
}: Props) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { id } = await params;
  const query = await searchParams;
  const autoPrint = query.print === "1";
  const autoPdf = query.pdf === "1";

  const invoice = await db.invoice.findFirst({
    where: { id, companyId: user.companyId },
    include: {
      items: { orderBy: { createdAt: "asc" } },
      printHistory: { orderBy: { createdAt: "desc" }, take: 50 },
      pdfHistory: { orderBy: { createdAt: "desc" }, take: 50 },
      template: true,
      sale: { select: { id: true, status: true } },
    },
  });

  if (!invoice) notFound();

  const config: InvoiceTemplateConfig = {
    ...DEFAULT_INVOICE_CONFIG,
    ...((invoice.template?.config as Partial<InvoiceTemplateConfig>) || {}),
    labels: { ...DEFAULT_INVOICE_CONFIG.labels, ...(((invoice.template?.config as Partial<InvoiceTemplateConfig>) || {}).labels || {}) },
  };

  const size = (invoice.template?.size || "A4") as InvoiceSizeOption;
  const preview = mapInvoiceToPreview({ ...invoice, mode: "SALE", currency: invoice.items[0]?.currency });

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Link
            href="/dashboard/invoices"
            className="rounded-xl border p-2 text-slate-600 hover:bg-slate-50"
          >
            <ArrowRight size={20} />
          </Link>
          <div>
            <h1 className="text-3xl font-black text-[#FFAE42] sm:text-4xl">
              {invoice.invoiceNo}
            </h1>
            <p className="mt-2 text-slate-500">
              {invoice.customerName} · {formatMoney(invoice.grandTotal)} ·{" "}
              {PAYMENT_METHOD_LABELS[invoice.paymentMethod]}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <span
                className={`rounded-full px-3 py-1 font-medium ${
                  invoice.status === "ACTIVE"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {invoice.status === "ACTIVE" ? "چالاک" : "هەڵوەشاوە"}
              </span>
              {invoice.createdByName ? (
                <span className="rounded-full bg-[#FFF8EF] px-3 py-1 font-medium text-[#FFAE42]">
                  دروستکراو: {invoice.createdByName}
                </span>
              ) : null}
              {invoice.sale ? (
                <Link
                  href={`/dashboard/sales/${invoice.sale.id}`}
                  className="rounded-full border px-3 py-1 font-medium text-slate-600 hover:bg-slate-50"
                >
                  فرۆشتن
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <InvoiceViewer
        invoiceId={invoice.id}
        invoiceNo={invoice.invoiceNo}
        company={{
          name: invoice.companyName,
          email: invoice.companyEmail,
          phone: invoice.companyPhone,
          address: invoice.companyAddress,
          website: invoice.companyWebsite,
          logo: invoice.companyLogo,
          taxNumber: invoice.companyTaxNumber,
          invoiceHeader: invoice.companyInvoiceHeader,
          invoiceFooter: invoice.companyInvoiceFooter,
          signature: invoice.companySignature,
          stamp: invoice.companyStamp,
        }}
        config={config}
        size={size}
        data={preview}
        templateName={invoice.template?.name || "قاڵبی بنەڕەتی"}
        printHistory={invoice.printHistory}
        pdfHistory={invoice.pdfHistory}
        autoPrint={autoPrint}
        autoPdf={autoPdf}
      />

      <RecordVersionHistorySection
        entityType="پسوولە"
        entityId={invoice.id}
        recordLabel={invoice.invoiceNo}
      />
    </div>
  );
}
