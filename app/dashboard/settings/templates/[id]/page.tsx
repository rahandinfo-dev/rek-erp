import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/prisma/db";
import InvoiceTemplateEditor from "@/components/invoices/InvoiceTemplateEditor";
import {
  DEFAULT_INVOICE_CONFIG,
  type InvoiceTemplateConfig,
  type InvoiceSizeOption,
  type InvoiceDocTypeOption,
} from "@/lib/invoices/template-config";

type Props = { params: Promise<{ id: string }> };

export default async function EditTemplatePage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { id } = await params;
  const template = await db.invoiceTemplate.findFirst({
    where: { id, companyId: user.companyId },
  });

  if (!template) notFound();

  const config = {
    ...DEFAULT_INVOICE_CONFIG,
    ...(template.config as Partial<InvoiceTemplateConfig>),
  };

  return (
    <InvoiceTemplateEditor
      company={{
        name: user.company.name,
        email: user.company.email,
        phone: user.company.phone,
        address: user.company.address,
        website: user.company.website,
        logo: user.company.logo,
        taxNumber: user.company.taxNumber,
        invoiceHeader: user.company.invoiceHeader,
        invoiceFooter: user.company.invoiceFooter,
        signature: user.company.signature,
        stamp: user.company.stamp,
      }}
      initial={{
        id: template.id,
        name: template.name,
        isDefault: template.isDefault,
        size: template.size as InvoiceSizeOption,
        docType: template.docType as InvoiceDocTypeOption,
        config,
      }}
    />
  );
}
