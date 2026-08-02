import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { notFound } from "next/navigation";
import { db } from "@/lib/prisma/db";
import { getCurrentCompanyId } from "@/lib/auth/current-user";
import { DEFAULT_INVOICE_CONFIG, type InvoiceTemplateConfig, type InvoiceSizeOption } from "@/lib/invoices/template-config";
import { mapPurchaseToPreview } from "@/lib/invoices/map-preview";
import SaleInvoiceActions from "@/components/sales/SaleInvoiceActions";
import RecordVersionHistorySection from "@/components/versions/RecordVersionHistorySection";

type Props = { params: Promise<{ id: string }> };

export default async function PurchaseDetailPage({ params }: Props) {
  const companyId = await getCurrentCompanyId();
  if (!companyId) return null;
  const { id } = await params;
  const [purchase, template] = await Promise.all([
    db.purchase.findFirst({
      where: { id, companyId },
      include: { supplier: true, warehouse: true, company: true, items: { orderBy: { createdAt: "asc" } } },
    }),
    db.invoiceTemplate.findFirst({ where: { companyId, docType: "PURCHASE" }, orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }] }),
  ]);
  if (!purchase) notFound();
  const saved = (template?.config as Partial<InvoiceTemplateConfig>) || {};
  const config: InvoiceTemplateConfig = { ...DEFAULT_INVOICE_CONFIG, headerText: "پسوولەی کڕین", ...saved, labels: { ...DEFAULT_INVOICE_CONFIG.labels, ...(saved.labels || {}) } };

  return <div className="space-y-6 sm:space-y-8">
    <div className="no-print flex items-center gap-4"><Link href="/dashboard/purchases" className="rounded-xl border p-2"><ArrowRight size={20} /></Link><div><h1 className="text-3xl font-black text-[#FFAE42]">{purchase.invoiceNo}</h1><p className="text-slate-500">پسوولەی کڕین</p></div></div>
    <SaleInvoiceActions
      company={{ name: purchase.company.name, email: purchase.company.email, phone: purchase.company.phone, address: purchase.company.address, website: purchase.company.website, logo: purchase.company.logo, taxNumber: purchase.company.taxNumber, invoiceHeader: purchase.company.invoiceHeader, invoiceFooter: purchase.company.invoiceFooter }}
      config={config}
      size={(template?.size || "A4") as InvoiceSizeOption}
      data={mapPurchaseToPreview(purchase)}
    />
    <RecordVersionHistorySection entityType="Purchase" entityId={purchase.id} recordLabel={purchase.invoiceNo} />
  </div>;
}
