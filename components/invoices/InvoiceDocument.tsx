"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import type { InvoicePreviewData, InvoiceSizeOption, InvoiceTemplateConfig } from "@/lib/invoices/template-config";

type CompanyInfo = { name: string; email: string; phone?: string | null; address?: string | null; website?: string | null; logo?: string | null; taxNumber?: string | null; invoiceHeader?: string | null; invoiceFooter?: string | null; signature?: string | null; stamp?: string | null };
type Props = { config: InvoiceTemplateConfig; size: InvoiceSizeOption; company: CompanyInfo; data: InvoicePreviewData; className?: string };
const border = "1px solid #000";
const cell: CSSProperties = { border, padding: "5px 6px", verticalAlign: "middle", borderRadius: 0 };
function money(value: number, currency: string) { return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: currency === "IQD" ? 0 : 2 }).format(value)} ${currency}`; }
function InfoRow({ label, value }: { label: string; value?: string | null }) { return <div className="invoice-info-row"><b>{label}:</b><span>{value || "—"}</span></div>; }

export default function InvoiceDocument({ config, size, company, data, className }: Props) {
  if (size !== "A4") return <Thermal size={size} config={config} company={company} data={data} className={className}/>;
  const labels = config.labels;
  const paid = data.paidAmount ?? data.total;
  const remaining = Math.max(0, data.total - paid);
  return <article className={`invoice-a4 ${className || ""}`} dir="rtl" style={{ fontFamily: config.fontFamily, fontSize: config.fontSize, color: "#000", background: "#fff" }}>
    <header className="invoice-company-header">
      {config.showLogo && company.logo ? <Image src={company.logo} alt={company.name} width={72} height={72} unoptimized className="invoice-logo"/> : null}
      {config.showCompanyName ? <h1>{company.name}</h1> : null}
      <p className="invoice-subtitle">{config.companySubtitle}</p>
      <div className="invoice-contact">
        {config.showPhone && company.phone ? <span>{company.phone}</span> : null}{config.showPhone && config.phone2 ? <span>{config.phone2}</span> : null}
        {config.showAddress && company.address ? <span>{company.address}</span> : null}{config.showEmail && company.email ? <span>{company.email}</span> : null}{config.showWebsite && company.website ? <span>{company.website}</span> : null}
      </div>
    </header>
    <h2 className="invoice-title">{company.invoiceHeader || config.headerText}</h2>
    <section className="invoice-parties">
      <div><InfoRow label={labels.customerCode} value={data.customerCode}/><InfoRow label={labels.customerName} value={data.customerOrSupplier}/><InfoRow label={labels.customerPhone} value={data.customerPhone}/><InfoRow label={labels.customerAddress} value={data.customerAddress}/></div>
      <div><InfoRow label={labels.invoiceNo} value={data.invoiceNo}/><InfoRow label={labels.date} value={data.date}/><InfoRow label={labels.time} value={data.time}/><InfoRow label={labels.cashier} value={data.createdBy}/><InfoRow label={labels.warehouse} value={data.warehouse}/>{data.notes ? <InfoRow label={labels.reference} value={data.notes}/> : null}</div>
    </section>
    <table className="invoice-items"><thead><tr><th style={cell}>{labels.row}</th>{config.showSku ? <th style={cell}>{labels.sku}</th> : null}<th style={cell}>{labels.product}</th><th style={cell}>{labels.quantity}</th><th style={cell}>{labels.unit}</th><th style={cell}>{labels.unitPrice}</th>{config.showDiscount ? <th style={cell}>{labels.discount}</th> : null}{config.showTax ? <th style={cell}>{labels.tax}</th> : null}<th style={cell}>{labels.lineTotal}</th></tr></thead>
      <tbody>{data.items.map((item, index) => <tr key={`${item.sku || item.name}-${index}`}><td style={cell}>{index + 1}</td>{config.showSku ? <td style={cell}>{item.sku || "—"}</td> : null}<td className="invoice-product" style={cell}>{item.name}</td><td style={cell}>{item.quantity}</td><td style={cell}>{item.unit || "دانە"}</td><td style={cell}>{money(item.unitPrice, data.currency)}</td>{config.showDiscount ? <td style={cell}>{money(item.discount || 0, data.currency)}</td> : null}{config.showTax ? <td style={cell}>{money(item.tax || 0, data.currency)}</td> : null}<td style={cell}>{money(item.total, data.currency)}</td></tr>)}</tbody>
    </table>
    <section className="invoice-summary"><div className="invoice-summary-note">{data.notes || ""}</div><div className="invoice-totals"><InfoRow label={labels.subtotal} value={money(data.subtotal, data.currency)}/><InfoRow label={labels.discount} value={money(data.discount, data.currency)}/><InfoRow label={labels.tax} value={money(data.tax, data.currency)}/><InfoRow label={labels.additionalCharges} value={money(data.additionalCharges || 0, data.currency)}/><InfoRow label={labels.grandTotal} value={money(data.total, data.currency)}/><InfoRow label={labels.paid} value={money(paid, data.currency)}/><InfoRow label={labels.remaining} value={money(remaining, data.currency)}/></div></section>
    <footer className="invoice-footer">{config.thankYouText ? <strong>{config.thankYouText}</strong> : null}{(company.invoiceFooter || config.footerText) ? <p>{company.invoiceFooter || config.footerText}</p> : null}{config.termsEnabled && config.termsText ? <p className="invoice-policy">{config.termsText}</p> : null}
      {config.showSignatures && config.signatureEnabled ? <div className="invoice-signatures"><span>{labels.signature}</span><span>{labels.customerSignature}</span></div> : null}
      <div className="invoice-print-meta">{config.showPrintedBy ? <span>{labels.cashier}: {data.createdBy || "—"}</span> : null}{config.showPrintedAt ? <span>{labels.date}: {data.date} {data.time}</span> : null}</div>
    </footer>
  </article>;
}

function Thermal({ config, company, data, className }: Props) {
  const paid = data.paidAmount ?? data.total;
  return <article className={`invoice-thermal ${className || ""}`} dir="rtl">
    <header><h2>{company.name}</h2>{config.companySubtitle ? <p>{config.companySubtitle}</p> : null}<p>{company.invoiceHeader || config.headerText}</p></header>
    <div className="thermal-meta"><span>{data.invoiceNo}</span><span>{data.date} {data.time}</span></div>
    {data.customerOrSupplier ? <div className="thermal-customer"><b>{config.labels.customerName}:</b> {data.customerOrSupplier}{data.customerPhone ? <><br/>{data.customerPhone}</> : null}{data.customerAddress ? <><br/>{data.customerAddress}</> : null}</div> : null}
    <hr/>{data.items.map((item, i) => <div className="thermal-item" key={`${item.sku || item.name}-${i}`}><span>{item.name} × {item.quantity} {item.unit || "دانە"}</span><b>{money(item.total, data.currency)}</b></div>)}<hr/>
    <div className="thermal-totals"><div><span>{config.labels.subtotal}</span><b>{money(data.subtotal, data.currency)}</b></div>{data.discount ? <div><span>{config.labels.discount}</span><b>{money(data.discount, data.currency)}</b></div> : null}{data.tax ? <div><span>{config.labels.tax}</span><b>{money(data.tax, data.currency)}</b></div> : null}<div><strong>{config.labels.grandTotal}</strong><strong>{money(data.total, data.currency)}</strong></div><div><span>{config.labels.paid}</span><b>{money(paid, data.currency)}</b></div><div><span>{config.labels.remaining}</span><b>{money(Math.max(0, data.total - paid), data.currency)}</b></div></div>
    <footer><p>{company.invoiceFooter || config.footerText}</p>{config.termsEnabled && config.termsText ? <p>{config.termsText}</p> : null}</footer>
  </article>;
}
