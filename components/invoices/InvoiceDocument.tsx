"use client";

import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import type { InvoicePreviewData, InvoiceSizeOption, InvoiceTemplateConfig } from "@/lib/invoices/template-config";
import { formatReceiptDate, formatReceiptMoney, formatReceiptTime } from "@/lib/invoices/receipt-format";

export type ReceiptCompany = { name: string; email: string; phone?: string | null; address?: string | null; website?: string | null; logo?: string | null; taxNumber?: string | null; invoiceHeader?: string | null; invoiceFooter?: string | null };
type Props = { config: InvoiceTemplateConfig; size: InvoiceSizeOption; company: ReceiptCompany; data: InvoicePreviewData; className?: string };

function Field({ label, children, ltr = false }: { label: string; children?: ReactNode; ltr?: boolean }) {
  return <div className="invoice-info-row"><b>{label}:</b><span className={ltr ? "invoice-ltr" : undefined}>{children || "—"}</span></div>;
}

function partyLabels(data: InvoicePreviewData, config: InvoiceTemplateConfig) {
  if (data.mode !== "PURCHASE") return config.labels;
  return { ...config.labels, customerCode: "کۆدی دابینکەر", customerName: "ناوی دابینکەر", customerPhone: "ژ.مۆبایل", customerAddress: "ناونیشان" };
}

export default function InvoiceDocument(props: Props) {
  return props.size === "A4" ? <A4Receipt {...props} /> : <ThermalReceipt {...props} />;
}

function A4Receipt({ config, company, data, className }: Props) {
  const labels = partyLabels(data, config);
  const paid = data.paidAmount ?? data.total;
  const remaining = Math.max(0, data.total - paid);
  const remainingLabel = labels.remaining === "بالانسی پسوولە" ? "پارەی ماوە / باقی" : labels.remaining;
  const receiptNumber = config.documentPrefix && !data.invoiceNo.startsWith(`${config.documentPrefix}-`) ? `${config.documentPrefix}-${data.invoiceNo}` : data.invoiceNo;
  const style = { fontFamily: config.fontFamily, fontSize: config.fontSize, "--invoice-number-font": config.numericFontFamily } as CSSProperties;

  return <article className={`invoice-a4 ${className || ""}`} dir="rtl" style={style} data-paper="A4">
    <header className="invoice-company-header">
      {config.showLogo && company.logo ? <Image className="invoice-logo" src={company.logo} alt="" width={68} height={68} unoptimized /> : null}
      {config.showCompanyName ? <h1 style={{ fontFamily: config.titleFontFamily }}>{company.name}</h1> : null}
      {config.companySubtitle ? <p className="invoice-subtitle">{config.companySubtitle}</p> : null}
      {config.showAddress && (config.addressOverride || company.address) ? <p className="invoice-address">{config.addressOverride || company.address}</p> : null}
      <div className="invoice-contact">
        {config.showPhone && (config.phone1 || company.phone) ? <span className="invoice-ltr">☎ {config.phone1 || company.phone}</span> : null}
        {config.showPhone2 && config.phone2 ? <span className="invoice-ltr">☎ {config.phone2}</span> : null}
        {config.showEmail && company.email ? <span className="invoice-ltr">{company.email}</span> : null}
        {config.showWebsite && company.website ? <span className="invoice-ltr">{company.website}</span> : null}
      </div>
    </header>

    <h2 className="invoice-title" style={{ fontFamily: config.titleFontFamily }}>{config.headerText || (data.mode === "PURCHASE" ? "پسوولەی کڕین" : "پسوولەی فرۆشتن")}</h2>
    <section className="invoice-parties">
      <div>
        {config.showCustomerCode ? <Field label={labels.customerCode} ltr>{data.customerCode}</Field> : null}
        <Field label={labels.customerName}>{data.customerOrSupplier}</Field>
        {config.showCustomerPhone ? <Field label={labels.customerPhone} ltr>{data.customerPhone}</Field> : null}
        {config.showCustomerAddress ? <Field label={labels.customerAddress}>{data.customerAddress}</Field> : null}
      </div>
      <div>
        <Field label="جۆری پسوولە" ltr>{config.documentPrefix || (data.mode === "PURCHASE" ? "PUR" : "SA")}</Field>
        <Field label={labels.invoiceNo} ltr>{receiptNumber}</Field>
        <Field label={labels.date} ltr>{formatReceiptDate(data.date, config.dateFormat)}</Field>
        <Field label={labels.time} ltr>{formatReceiptTime(data.time, config.timeFormat)}</Field>
      </div>
    </section>

    <table className="invoice-items">
      <thead><tr><th>{labels.row}</th>{config.showSku ? <th>{labels.sku}</th> : null}<th>{labels.product}</th><th>{labels.unitPrice}</th><th>{labels.quantity}</th>{config.showDiscount ? <th>{labels.discount}</th> : null}{config.showTax ? <th>{labels.tax}</th> : null}<th>{labels.lineTotal}</th></tr></thead>
      <tbody>{data.items.map((item, index) => <tr key={`${item.sku || item.name}-${index}`}>
        <td>{index + 1}</td>{config.showSku ? <td className="invoice-ltr">{item.sku || "—"}</td> : null}<td className="invoice-product">{item.name}</td>
        <td className="invoice-ltr">{formatReceiptMoney(item.unitPrice, data.currency)}</td>
        <td>{item.quantity}{config.showUnit && item.unit ? ` ${item.unit}` : ""}</td>
        {config.showDiscount ? <td className="invoice-ltr">{formatReceiptMoney(item.discount || 0, data.currency)}</td> : null}
        {config.showTax ? <td className="invoice-ltr">{formatReceiptMoney(item.tax || 0, data.currency)}</td> : null}
        <td className="invoice-ltr">{formatReceiptMoney(item.total, data.currency)}</td>
      </tr>)}</tbody>
    </table>

    <section className="invoice-summary">
      <div className="invoice-totals">
        <Field label={labels.subtotal} ltr>{formatReceiptMoney(data.subtotal, data.currency)}</Field>
        {config.showDiscount && data.discount !== 0 ? <Field label={labels.discount} ltr>{formatReceiptMoney(data.discount, data.currency)}</Field> : null}
        {config.showTax && data.tax !== 0 ? <Field label={labels.tax} ltr>{formatReceiptMoney(data.tax, data.currency)}</Field> : null}
        <Field label={labels.paid} ltr>{formatReceiptMoney(paid, data.currency)}</Field>
        <Field label={remainingLabel} ltr>{formatReceiptMoney(remaining, data.currency)}</Field>
        <Field label={labels.grandTotal} ltr>{formatReceiptMoney(data.total, data.currency)}</Field>
      </div>
      {config.showNotes && data.notes ? <p className="invoice-notes">{data.notes}</p> : null}
    </section>
    <footer className="invoice-footer">{config.disclaimerEnabled && config.disclaimerText ? <p className="invoice-disclaimer">{config.disclaimerText}</p> : null}{config.thankYouText ? <p>{config.thankYouText}</p> : null}{config.footerText ? <p>{config.footerText}</p> : null}{config.termsEnabled && config.termsText ? <p className="invoice-policy">{config.termsText}</p> : null}</footer>
  </article>;
}

function ThermalReceipt({ config, company, data, className }: Props) {
  const labels = partyLabels(data, config); const paid = data.paidAmount ?? data.total;
  const remainingLabel = labels.remaining === "بالانسی پسوولە" ? "پارەی ماوە / باقی" : labels.remaining;
  return <article className={`invoice-thermal ${className || ""}`} dir="rtl" data-paper="80mm" style={{ fontFamily: config.fontFamily }}>
    <header><h2>{company.name}</h2>{config.companySubtitle ? <p>{config.companySubtitle}</p> : null}<strong>{config.headerText}</strong></header>
    <div className="thermal-meta"><span className="invoice-ltr">{data.invoiceNo}</span><span className="invoice-ltr">{data.date} {formatReceiptTime(data.time, config.timeFormat)}</span></div>
    {data.customerOrSupplier ? <div className="thermal-customer"><b>{labels.customerName}: </b>{data.customerOrSupplier}{config.showCustomerPhone && data.customerPhone ? <div className="invoice-ltr">{data.customerPhone}</div> : null}</div> : null}
    <div className="thermal-items">{data.items.map((item, index) => <div className="thermal-item" key={`${item.sku || item.name}-${index}`}><span>{index + 1}. {item.name}<small>{item.quantity}{config.showUnit && item.unit ? ` ${item.unit}` : ""}</small></span><b>{formatReceiptMoney(item.total, data.currency)}</b></div>)}</div>
    <div className="thermal-totals"><div><span>{labels.grandTotal}</span><strong>{formatReceiptMoney(data.total, data.currency)}</strong></div><div><span>{labels.paid}</span><b>{formatReceiptMoney(paid, data.currency)}</b></div><div><span>{remainingLabel}</span><b>{formatReceiptMoney(Math.max(0, data.total - paid), data.currency)}</b></div></div>
    {config.disclaimerEnabled ? <footer>{config.disclaimerText}</footer> : null}
  </article>;
}
