"use client";

import { type RefObject } from "react";
import InvoiceDocument, { type ReceiptCompany } from "@/components/invoices/InvoiceDocument";
import type { InvoicePreviewData, InvoiceSizeOption, InvoiceTemplateConfig } from "@/lib/invoices/template-config";

type Props = {
  config: InvoiceTemplateConfig;
  size: InvoiceSizeOption;
  company: ReceiptCompany;
  data: InvoicePreviewData;
  receiptRef: RefObject<HTMLDivElement | null>;
};

/** The editor renders the canonical, unscaled invoice DOM in a scroll viewport. */
export default function InvoicePreviewCanvas({ config, size, company, data, receiptRef }: Props) {
  return (
    <div className="invoice-preview-viewport" data-testid="invoice-preview-viewport">
      <div ref={receiptRef} className="invoice-preview-document">
        <InvoiceDocument config={config} size={size} company={company} data={data} />
      </div>
    </div>
  );
}
