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
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            if (!ref.current) return;
            printElement(ref.current, data.invoiceNo);
            void reportClientNotification({
              type: "INVOICE_PRINTED",
              title: "پسوولە چاپکرا",
              message: `پسوولەی ${data.invoiceNo} چاپکرا.`,
              href: "/dashboard/sales",
              entityType: "Sale",
              entityId: data.invoiceNo,
            });
          }}
          className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#FFAE42] px-4 font-semibold text-white"
        >
          <Printer size={16} />
          چاپ
        </button>
        <button
          type="button"
          onClick={() => {
            if (!ref.current) return;
            exportElementToPdf(ref.current, `${data.invoiceNo}.pdf`);
            void reportClientNotification({
              type: "PDF_GENERATED",
              title: "PDF دروستکرا",
              message: `PDFی پسوولەی ${data.invoiceNo} دروستکرا.`,
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
