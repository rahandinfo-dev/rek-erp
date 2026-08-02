"use client";

import { useRef } from "react";
import { Download, Printer } from "lucide-react";
import InvoiceDocument from "@/components/invoices/InvoiceDocument";
import {
  exportElementToPdf,
  printElement,
} from "@/lib/export";
import { reportClientNotification } from "@/lib/notifications/client";
import type {
  InvoicePreviewData,
  InvoiceSizeOption,
  InvoiceTemplateConfig,
} from "@/lib/invoices/template-config";
import { useT } from "@/components/i18n/LocaleProvider";

type Props = {
  company: {
    name: string;
    email: string;
    phone?: string | null;
    address?: string | null;
    website?: string | null;
    logo?: string | null;
    taxNumber?: string | null;
    invoiceHeader?: string | null;
    invoiceFooter?: string | null;
    signature?: string | null;
    stamp?: string | null;
  };
  config: InvoiceTemplateConfig;
  size: InvoiceSizeOption;
  data: InvoicePreviewData;
};

export default function SaleInvoiceActions({
  company,
  config,
  size,
  data,
}: Props) {
  const { t } = useT();
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={async () => {
            if (!ref.current) return;
            await printElement(ref.current, data.invoiceNo);
            void reportClientNotification({
              type: "INVOICE_PRINTED",
              title: t("invoices.printedTitle"),
              message: t("invoices.printedBody", { no: data.invoiceNo }),
              href: "/dashboard/sales",
              entityType: "Sale",
              entityId: data.invoiceNo,
            });
          }}
          className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#FFAE42] px-4 font-semibold text-white"
        >
          <Printer size={16} />
          {t("common.print")}
        </button>
        <button
          type="button"
          onClick={async () => {
            if (!ref.current) return;
            await exportElementToPdf(ref.current, `${data.invoiceNo}.pdf`);
            void reportClientNotification({
              type: "PDF_GENERATED",
              title: t("invoices.pdfTitle"),
              message: t("invoices.pdfBody", { no: data.invoiceNo }),
              href: "/dashboard/sales",
              entityType: "Sale",
              entityId: data.invoiceNo,
            });
          }}
          className="inline-flex h-11 items-center gap-2 rounded-2xl border px-4 font-semibold"
        >
          <Download size={16} />
          PDF
        </button>
      </div>

      <div ref={ref} className="max-w-full min-w-0 overflow-x-auto rounded-3xl bg-slate-100 p-4">
        <InvoiceDocument
          config={config}
          size={size}
          company={company}
          data={data}
        />
      </div>
    </div>
  );
}
