import { getCurrentUser } from "@/lib/auth/current-user";
import InvoiceTemplateEditor from "@/components/invoices/InvoiceTemplateEditor";

export default async function NewTemplatePage() {
  const user = await getCurrentUser();
  if (!user) return null;

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
    />
  );
}
