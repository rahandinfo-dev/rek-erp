"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import InvoiceDocument, { type ReceiptCompany } from "@/components/invoices/InvoiceDocument";
import type { InvoicePreviewData, InvoiceSizeOption, InvoiceTemplateConfig } from "@/lib/invoices/template-config";

const A4_WIDTH_PX = 210 * (96 / 25.4);
const A4_HEIGHT_PX = 297 * (96 / 25.4);

type Props = {
  config: InvoiceTemplateConfig;
  size: InvoiceSizeOption;
  company: ReceiptCompany;
  data: InvoicePreviewData;
  receiptRef: RefObject<HTMLDivElement | null>;
};

/** Scales the complete logical A4 sheet as one unit; receipt geometry never reflows. */
export default function InvoicePreviewCanvas({ config, size, company, data, receiptRef }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || size !== "A4") return;

    const resize = () => setScale(Math.min(1, Math.max(0.2, (viewport.clientWidth - 32) / A4_WIDTH_PX)));
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [size]);

  if (size !== "A4") {
    return <div ref={viewportRef} className="invoice-preview-viewport"><div ref={receiptRef}><InvoiceDocument config={config} size={size} company={company} data={data} /></div></div>;
  }

  return (
    <div ref={viewportRef} className="invoice-preview-viewport" data-testid="a4-preview-viewport">
      <div
        className="invoice-preview-stage"
        data-testid="a4-preview-stage"
        style={{ width: A4_WIDTH_PX * scale, minHeight: A4_HEIGHT_PX * scale }}
      >
        <div
          className="invoice-preview-canvas"
          style={{ width: A4_WIDTH_PX, transform: `translateX(-50%) scale(${scale})` }}
        >
          <div ref={receiptRef}>
            <InvoiceDocument config={config} size="A4" company={company} data={data} />
          </div>
        </div>
      </div>
    </div>
  );
}
