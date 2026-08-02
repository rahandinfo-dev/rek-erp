"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import type { InvoicePreviewData, InvoiceSizeOption, InvoiceTemplateConfig } from "@/lib/invoices/template-config";
import { formatReceiptDate, formatReceiptMoney, formatReceiptTime } from "@/lib/invoices/receipt-format";
import { decimalCompare, decimalString } from "@/lib/invoices/decimal";

export type ReceiptCompany = { name: string; email: string; phone?: string | null; address?: string | null; website?: string | null; logo?: string | null; taxNumber?: string | null; invoiceHeader?: string | null; invoiceFooter?: string | null };
type Props = { config: InvoiceTemplateConfig; size: InvoiceSizeOption; company: ReceiptCompany; data: InvoicePreviewData; className?: string };

function Field({ label, children, ltr = false, emphasis }: { label: string; children?: ReactNode; ltr?: boolean; emphasis?: "invoice-number" | "money" }) {
  const valueClassName = [ltr ? "invoice-ltr" : "", emphasis === "invoice-number" ? "invoice-number" : "", emphasis === "money" ? "invoice-money" : ""].filter(Boolean).join(" ") || undefined;
  return <div className="invoice-info-row"><b>{label}:</b><span className={valueClassName} dir={ltr ? "ltr" : undefined}>{children ?? "—"}</span></div>;
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
  const hasLineDiscount = data.items.every((item) => item.discount !== undefined);
  const hasLineTax = data.items.every((item) => item.tax !== undefined);
  const remainingLabel = labels.remaining === "بالانسی پسوولە" ? "پارەی ماوە / باقی" : labels.remaining;
  return <article className={`invoice-a4 ${className || ""}`} dir="rtl" lang="ckb" data-paper="A4">
    <header className="invoice-company-header">
      {config.showLogo && company.logo ? <Image className="invoice-logo" src={company.logo} alt="" width={68} height={68} unoptimized /> : null}
      <div className="invoice-company-copy">
        {config.showCompanyName ? <h1>{company.name}</h1> : null}
        {config.companySubtitle ? <p className="invoice-subtitle">{config.companySubtitle}</p> : null}
        {config.showAddress && company.address ? <p className="invoice-address">{company.address}</p> : null}
        <div className="invoice-contact">
          {config.showPhone && company.phone ? <span className="invoice-ltr" dir="ltr">☎ {company.phone}</span> : null}
          {config.showEmail && company.email ? <span className="invoice-ltr" dir="ltr">{company.email}</span> : null}
          {config.showWebsite && company.website ? <span className="invoice-ltr" dir="ltr">{company.website}</span> : null}
        </div>
      </div>
    </header>

    <h2 className="invoice-title">{config.headerText || (data.mode === "PURCHASE" ? "پسوولەی کڕین" : "پسوولەی فرۆشتن")}</h2>
    <section className="invoice-parties">
      <div>
        {config.showCustomerHeading && config.customerHeading.trim() ? <h3 className="invoice-party-heading">{config.customerHeading}</h3> : null}
        {config.showCustomerCode ? <Field label={labels.customerCode} ltr>{data.customerCode}</Field> : null}
        <Field label={labels.customerName}>{data.customerOrSupplier}</Field>
        {config.showCustomerPhone ? <Field label={labels.customerPhone} ltr>{data.customerPhone}</Field> : null}
        {config.showCustomerAddress ? <Field label={labels.customerAddress}>{data.customerAddress}</Field> : null}
      </div>
      <div>
        <Field label="جۆری پسوولە" ltr>{config.documentPrefix || (data.mode === "PURCHASE" ? "PUR" : "SA")}</Field>
        <Field label={labels.invoiceNo} ltr emphasis="invoice-number">{data.invoiceNo}</Field>
        <Field label={labels.date} ltr>{formatReceiptDate(data.date, config.dateFormat)}</Field>
        <Field label={labels.time} ltr>{formatReceiptTime(data.time, config.timeFormat)}</Field>
      </div>
    </section>

    <table className="invoice-items">
      <colgroup><col className="invoice-col-row" />{config.showSku ? <col className="invoice-col-sku" /> : null}<col className="invoice-col-product" /><col className="invoice-col-money" /><col className="invoice-col-quantity" />{config.showDiscount && hasLineDiscount ? <col className="invoice-col-money" /> : null}{config.showTax && hasLineTax ? <col className="invoice-col-money" /> : null}<col className="invoice-col-money" /></colgroup>
      <thead><tr><th>{labels.row}</th>{config.showSku ? <th>{labels.sku}</th> : null}<th>{labels.product}</th><th>{labels.unitPrice}</th><th>{labels.quantity}</th>{config.showDiscount && hasLineDiscount ? <th>{labels.discount}</th> : null}{config.showTax && hasLineTax ? <th>{labels.tax}</th> : null}<th>{labels.lineTotal}</th></tr></thead>
      <tbody>{data.items.map((item, index) => <tr key={`${item.sku || item.name}-${index}`}>
        <td className="invoice-ltr" dir="ltr">{index + 1}</td>{config.showSku ? <td className="invoice-ltr" dir="ltr">{item.sku || "—"}</td> : null}<td className="invoice-product">{item.name}</td>
        <td className="invoice-ltr invoice-money" dir="ltr">{formatReceiptMoney(item.unitPrice, data.currency)}</td>
        <td className="invoice-quantity"><bdi>{decimalString(item.quantity)}</bdi>{config.showUnit && item.unit ? ` ${item.unit}` : ""}</td>
        {config.showDiscount && hasLineDiscount ? <td className="invoice-ltr invoice-money" dir="ltr">{formatReceiptMoney(item.discount!, data.currency)}</td> : null}
        {config.showTax && hasLineTax ? <td className="invoice-ltr invoice-money" dir="ltr">{formatReceiptMoney(item.tax!, data.currency)}</td> : null}
        <td className="invoice-ltr invoice-money invoice-line-total" dir="ltr">{formatReceiptMoney(item.total, data.currency)}</td>
      </tr>)}</tbody>
    </table>

    <section className="invoice-summary">
      <div className="invoice-totals">
        <Field label={labels.subtotal} ltr emphasis="money">{formatReceiptMoney(data.subtotal, data.currency)}</Field>
        {config.showDiscount && decimalCompare(data.discount, 0) !== 0 ? <Field label={labels.discount} ltr emphasis="money">{formatReceiptMoney(data.discount, data.currency)}</Field> : null}
        {config.showTax && decimalCompare(data.tax, 0) !== 0 ? <Field label={labels.tax} ltr emphasis="money">{formatReceiptMoney(data.tax, data.currency)}</Field> : null}
        {data.paidAmount !== undefined ? <Field label={labels.paid} ltr emphasis="money">{formatReceiptMoney(data.paidAmount, data.currency)}</Field> : null}
        {data.remainingBalance !== undefined ? <Field label={remainingLabel} ltr emphasis="money">{formatReceiptMoney(data.remainingBalance, data.currency)}</Field> : null}
        <Field label={labels.grandTotal} ltr emphasis="money">{formatReceiptMoney(data.total, data.currency)}</Field>
      </div>
      {config.showNotes && data.notes ? <p className="invoice-notes">{data.notes}</p> : null}
    </section>
    <footer className="invoice-footer">{config.disclaimerEnabled && config.disclaimerText ? <p className="invoice-disclaimer">{config.disclaimerText}</p> : null}{config.thankYouText ? <p>{config.thankYouText}</p> : null}{config.footerText ? <p>{config.footerText}</p> : null}{config.termsEnabled && config.termsText ? <p className="invoice-policy">{config.termsText}</p> : null}</footer>
  </article>;
}

function ThermalReceipt({ config, company, data, className }: Props) {
  const labels = partyLabels(data, config);
  const remainingLabel = labels.remaining === "بالانسی پسوولە" ? "پارەی ماوە / باقی" : labels.remaining;
  return <article className={`invoice-thermal ${className || ""}`} dir="rtl" lang="ckb" data-paper="80mm">
    <header><h2>{company.name}</h2>{config.companySubtitle ? <p>{config.companySubtitle}</p> : null}<strong>{config.headerText}</strong></header>
    <div className="thermal-meta"><span className="invoice-ltr invoice-number" dir="ltr">{data.invoiceNo}</span><span className="invoice-ltr" dir="ltr">{data.date} {formatReceiptTime(data.time, config.timeFormat)}</span></div>
    {data.customerOrSupplier ? <div className="thermal-customer">{config.showCustomerHeading && config.customerHeading.trim() ? <h3 className="thermal-customer-heading">{config.customerHeading}</h3> : null}<b>{labels.customerName}: </b>{data.customerOrSupplier}{config.showCustomerPhone && data.customerPhone ? <div className="invoice-ltr">{data.customerPhone}</div> : null}</div> : null}
    <div className="thermal-items">{data.items.map((item, index) => <div className="thermal-item" key={`${item.sku || item.name}-${index}`}><span>{index + 1}. {item.name}<small><bdi>{decimalString(item.quantity)}</bdi>{config.showUnit && item.unit ? ` ${item.unit}` : ""} × <bdi>{formatReceiptMoney(item.unitPrice, data.currency)}</bdi>{config.showDiscount && item.discount !== undefined ? ` · ${labels.discount}: ${formatReceiptMoney(item.discount, data.currency)}` : ""}</small></span><b dir="ltr">{formatReceiptMoney(item.total, data.currency)}</b></div>)}</div>
    <div className="thermal-totals"><div><span>{labels.subtotal}</span><b dir="ltr">{formatReceiptMoney(data.subtotal, data.currency)}</b></div>{config.showDiscount && decimalCompare(data.discount, 0) !== 0 ? <div><span>{labels.discount}</span><b dir="ltr">{formatReceiptMoney(data.discount, data.currency)}</b></div> : null}{config.showTax && decimalCompare(data.tax, 0) !== 0 ? <div><span>{labels.tax}</span><b dir="ltr">{formatReceiptMoney(data.tax, data.currency)}</b></div> : null}<div><span>{labels.grandTotal}</span><strong dir="ltr">{formatReceiptMoney(data.total, data.currency)}</strong></div>{data.paidAmount !== undefined ? <div><span>{labels.paid}</span><b dir="ltr">{formatReceiptMoney(data.paidAmount, data.currency)}</b></div> : null}{data.remainingBalance !== undefined ? <div><span>{remainingLabel}</span><b dir="ltr">{formatReceiptMoney(data.remainingBalance, data.currency)}</b></div> : null}</div>
    {config.disclaimerEnabled ? <footer>{config.disclaimerText}</footer> : null}
  </article>;
}
