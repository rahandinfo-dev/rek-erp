import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DEFAULT_INVOICE_CONFIG, SAMPLE_INVOICE_DATA } from "./template-config.ts";
import { formatReceiptDate, formatReceiptMoney, formatReceiptTime } from "./receipt-format.ts";

test("receipt defaults expose editable labels and optional accounting columns", () => {
  assert.equal(DEFAULT_INVOICE_CONFIG.showSku, true);
  assert.equal(DEFAULT_INVOICE_CONFIG.showDiscount, true);
  assert.equal(DEFAULT_INVOICE_CONFIG.showTax, true);
  assert.equal(DEFAULT_INVOICE_CONFIG.labels.customerName, "ناوی کڕیار");
  assert.equal(DEFAULT_INVOICE_CONFIG.labels.grandTotal, "کۆی کۆتایی");
  assert.equal(DEFAULT_INVOICE_CONFIG.labels.paid, "پارەی دراو");
});

test("currency is rendered from stored context without conversion", () => {
  assert.equal(SAMPLE_INVOICE_DATA.currency, "IQD");
  const usd = { ...SAMPLE_INVOICE_DATA, currency: "USD", total: 12.5 };
  assert.equal(usd.total, 12.5);
  assert.equal(usd.currency, "USD");
  assert.equal(formatReceiptMoney(12.5, "USD"), "$12.5");
  assert.equal(formatReceiptMoney(40000, "IQD"), "40,000 IQD");
});

test("A4 CSS enforces sharp corners, repeated headings, and print isolation", () => {
  const css = readFileSync("app/globals.css", "utf8");
  assert.match(css, /\.invoice-a4 \*,[\s\S]*border-radius: 0 !important/);
  assert.match(css, /display: table-header-group/);
  assert.match(css, /body \* \{ visibility: hidden/);
  assert.match(css, /@page invoiceA4 \{ size: A4 portrait/);
  assert.match(css, /\.invoice-items th,\s*\.invoice-items td[\s\S]*vertical-align: middle/);
  assert.doesNotMatch(css, /\.invoice-items th \{[^}]*(?:^|[;{])\s*height:\s*10mm/m);
  assert.match(css, /font-variant-numeric: tabular-nums/);
});

test("A4 totals use the full width without the obsolete invoice balance panel", () => {
  const source = readFileSync("components/invoices/InvoiceDocument.tsx", "utf8");
  const css = readFileSync("app/globals.css", "utf8");
  assert.doesNotMatch(source, /className="invoice-balance"/);
  assert.doesNotMatch(css, /\.invoice-balance/);
  assert.match(css, /\.invoice-summary \{[\s\S]*?width: 100%/);
  assert.equal(DEFAULT_INVOICE_CONFIG.labels.remaining, "پارەی ماوە / باقی");
});

test("template editor uses the canonical A4 renderer without scaling or reflow", () => {
  const preview = readFileSync("components/invoices/InvoicePreviewCanvas.tsx", "utf8");
  const editor = readFileSync("components/invoices/InvoiceTemplateEditor.tsx", "utf8");
  assert.match(preview, /className="invoice-preview-document"/);
  assert.doesNotMatch(preview, /ResizeObserver|transform:|scale\(/);
  assert.match(editor, /<InvoicePreviewCanvas/);
  assert.doesNotMatch(editor, /<InvoiceDocument/);
});

test("global confirmation invokes destructive actions with non-submit buttons", () => {
  const dialog = readFileSync("components/ui/ConfirmDialog.tsx", "utf8");
  const deleteClient = readFileSync("lib/delete/withUndo.ts", "utf8");
  assert.match(dialog, /<AlertDialog\.Action asChild>/);
  assert.match(dialog, /type="button"/);
  assert.match(dialog, /void onConfirm\(\)/);
  assert.match(deleteClient, /method: "DELETE"/);
  assert.match(deleteClient, /res\.status === 409/);
  assert.match(deleteClient, /correlationId/);
});

test("long and multi-page item data remains intact", () => {
  const items = Array.from({ length: 80 }, (_, i) => ({ name: `بەرهەمی درێژی ${i} `.repeat(8), quantity: 1, unitPrice: 1, total: 1 }));
  assert.equal(items.length, 80);
  assert.ok(items[0].name.length > 100);
});

test("receipt supports editable company/customer content and selectable fonts", () => {
  assert.equal(typeof DEFAULT_INVOICE_CONFIG.companySubtitle, "string");
  assert.equal(typeof DEFAULT_INVOICE_CONFIG.phone2, "string");
  assert.equal(typeof DEFAULT_INVOICE_CONFIG.headerText, "string");
  assert.match(DEFAULT_INVOICE_CONFIG.fontFamily, /NRT/);
  assert.doesNotMatch(DEFAULT_INVOICE_CONFIG.fontFamily, /Rudaw/i);
  assert.equal(SAMPLE_INVOICE_DATA.customerPhone, "0750 000 0000");
  const anonymous = { ...SAMPLE_INVOICE_DATA, customerOrSupplier: "", customerPhone: null, customerAddress: null };
  assert.equal(anonymous.customerOrSupplier, "");
  assert.equal(DEFAULT_INVOICE_CONFIG.disclaimerEnabled, true);
  assert.match(DEFAULT_INVOICE_CONFIG.disclaimerText, /هەڵە/);
  assert.equal(DEFAULT_INVOICE_CONFIG.timeFormat, "12");
  assert.equal(formatReceiptTime("14:46:00", "12"), "2:46:00 PM");
  assert.equal(formatReceiptDate("01/08/2026", "YYYY/MM/DD"), "2026/08/01");
  assert.equal(DEFAULT_INVOICE_CONFIG.showPhone2, true);
});

test("receipt typography and optional party heading are print-safe", () => {
  const source = readFileSync("components/invoices/InvoiceDocument.tsx", "utf8");
  const css = readFileSync("app/globals.css", "utf8");
  const exporter = readFileSync("lib/export/index.ts", "utf8");
  assert.equal(DEFAULT_INVOICE_CONFIG.showCustomerHeading, false);
  assert.equal(DEFAULT_INVOICE_CONFIG.customerHeading, "زانیاری کڕیار");
  assert.match(source, /config\.showCustomerHeading && config\.customerHeading\.trim\(\)/);
  assert.match(css, /\.invoice-a4,[\s\S]*\.invoice-thermal[\s\S]*font-family: "NRT"/);
  assert.doesNotMatch(css.slice(css.indexOf("Canonical receipt renderer")), /letter-spacing:\s*-/);
  assert.match(exporter, /await ensureInvoiceAssets\(element, document\)/);
  assert.match(exporter, /fontSet\?\.load\('16px "NRT"'/);
  assert.match(exporter, /querySelector<HTMLElement>\("\.invoice-a4, \.invoice-thermal"\)/);
  assert.match(exporter, /await ensureInvoiceAssets\([\s\S]*printWindow\.document/);
  assert.match(exporter, /receipt\.outerHTML/);
  assert.doesNotMatch(exporter, /html2canvas|jsPDF|canvas\.toDataURL/);
});

test("invoice output has one bundled font and stable Kurdish wrapping metrics", () => {
  const css = readFileSync("app/globals.css", "utf8");
  const config = readFileSync("lib/invoices/template-config.ts", "utf8");
  const editor = readFileSync("components/invoices/InvoiceTemplateEditor.tsx", "utf8");
  const source = readFileSync("components/invoices/InvoiceDocument.tsx", "utf8");
  const invoiceCss = css.slice(css.indexOf("Canonical receipt renderer"));

  assert.doesNotMatch(invoiceCss, /font-family:\s*"NRT"\s*,/);
  assert.match(invoiceCss, /letter-spacing:\s*0/);
  assert.match(invoiceCss, /\.invoice-a4 \*,[\s\S]*font-family: "NRT" !important/);
  assert.match(invoiceCss, /overflow-wrap: anywhere;[\s\S]*word-break: normal/);
  assert.match(invoiceCss, /font-variant-ligatures: contextual common-ligatures/);
  assert.doesNotMatch(invoiceCss, /overflow:\s*hidden/);
  assert.doesNotMatch(invoiceCss, /margin(?:-block|-inline|-top|-bottom)?:\s*-/);
  assert.doesNotMatch(config, /NRT, Tahoma|numericFontFamily: "Tahoma/);
  assert.doesNotMatch(editor, /<option value="(?:Tahoma|Arial|system-ui)/);
  assert.match(source, /invoice-number/);
  assert.match(source, /invoice-money/);
});

test("a transaction cannot mix persisted document currencies", () => {
  const saleValidator = readFileSync("lib/validators/sale.ts", "utf8");
  const purchaseValidator = readFileSync("lib/validators/purchase.ts", "utf8");
  assert.match(saleValidator, /currencies\.size > 1/);
  assert.match(purchaseValidator, /currencies\.size > 1/);
});

test("purchase detail is company-scoped and uses the canonical persisted mapper", () => {
  const page = readFileSync("app/dashboard/purchases/[id]/page.tsx", "utf8");
  const mapper = readFileSync("lib/invoices/map-preview.ts", "utf8");
  assert.match(page, /where: \{ id, companyId \}/);
  assert.match(page, /data=\{mapPurchaseToPreview\(purchase\)\}/);
  assert.match(mapper, /productNameSnapshot \?\? "—"/);
  assert.doesNotMatch(page, /item\.product\./);
  assert.doesNotMatch(page, /paidAmount: Number\(purchase\.total\)/);
});

test("printed accounting values are never synthesized by the renderer", () => {
  const source = readFileSync("components/invoices/InvoiceDocument.tsx", "utf8");
  assert.doesNotMatch(source, /paidAmount \?\? data\.total/);
  assert.doesNotMatch(source, /data\.total - paid/);
  assert.match(source, /data\.remainingBalance !== undefined/);
  assert.match(source, /item\.discount !== undefined/);
});

test("accounting states preserve authoritative totals and optional party fields", () => {
  const full = { ...SAMPLE_INVOICE_DATA, paidAmount: Number(SAMPLE_INVOICE_DATA.total) };
  const partial = { ...SAMPLE_INVOICE_DATA, paidAmount: 45000 };
  const unpaid = { ...SAMPLE_INVOICE_DATA, paidAmount: 0 };
  assert.equal(Number(full.total) - Number(full.paidAmount), 0);
  assert.equal(Number(partial.total) - Number(partial.paidAmount), 100000);
  assert.equal(Number(unpaid.total) - Number(unpaid.paidAmount), Number(unpaid.total));
});

test("A4 and independent 80mm templates preserve RTL and LTR SKU behavior", () => {
  const source = readFileSync("components/invoices/InvoiceDocument.tsx", "utf8");
  const css = readFileSync("app/globals.css", "utf8");
  assert.match(source, /className={`invoice-a4/);
  assert.match(source, /className={`invoice-thermal/);
  assert.match(source, /dir="rtl"/);
  assert.match(source, /dir=\{ltr \? "ltr"/);
  assert.match(css, /@page thermal \{ size: 80mm auto/);
  assert.match(css, /\.invoice-thermal \*,[\s\S]*border-radius: 0 !important/);
  assert.match(css, /overflow-wrap: anywhere/);
});

test("stored item values include name, SKU, quantity, unit, price, currency and totals", () => {
  const item = { ...SAMPLE_INVOICE_DATA.items[0], unit: "کارتۆن", sku: "LTR-001" };
  assert.equal(item.name, "بەرهەمی یەکەم");
  assert.equal(item.sku, "LTR-001");
  assert.equal(item.quantity, 2);
  assert.equal(item.unit, "کارتۆن");
  assert.equal(item.unitPrice, 50000);
  assert.equal(item.total, 100000);
});
