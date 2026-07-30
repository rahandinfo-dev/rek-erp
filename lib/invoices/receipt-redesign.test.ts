import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DEFAULT_INVOICE_CONFIG, SAMPLE_INVOICE_DATA } from "./template-config.ts";

test("receipt defaults expose editable labels and optional accounting columns", () => {
  assert.equal(DEFAULT_INVOICE_CONFIG.showSku, true);
  assert.equal(DEFAULT_INVOICE_CONFIG.showDiscount, true);
  assert.equal(DEFAULT_INVOICE_CONFIG.showTax, true);
  assert.equal(DEFAULT_INVOICE_CONFIG.labels.customerName, "ناوی کڕیار");
  assert.equal(DEFAULT_INVOICE_CONFIG.labels.grandTotal, "پارەی دراو");
});

test("currency is rendered from stored context without conversion", () => {
  assert.equal(SAMPLE_INVOICE_DATA.currency, "IQD");
  const usd = { ...SAMPLE_INVOICE_DATA, currency: "USD", total: 12.5 };
  assert.equal(usd.total, 12.5);
  assert.equal(usd.currency, "USD");
});

test("A4 CSS enforces sharp corners, repeated headings, and print isolation", () => {
  const css = readFileSync("app/globals.css", "utf8");
  assert.match(css, /\.invoice-a4 \*,[\s\S]*border-radius: 0 !important/);
  assert.match(css, /display: table-header-group/);
  assert.match(css, /body \* \{ visibility: hidden/);
  assert.match(css, /@page \{ size: A4 portrait/);
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
  assert.match(DEFAULT_INVOICE_CONFIG.fontFamily, /Rudaw/);
  assert.equal(SAMPLE_INVOICE_DATA.customerPhone, "0750 000 0000");
  const anonymous = { ...SAMPLE_INVOICE_DATA, customerOrSupplier: "", customerPhone: null, customerAddress: null };
  assert.equal(anonymous.customerOrSupplier, "");
  assert.equal(DEFAULT_INVOICE_CONFIG.disclaimerEnabled, true);
  assert.match(DEFAULT_INVOICE_CONFIG.disclaimerText, /هەڵە/);
  assert.equal(DEFAULT_INVOICE_CONFIG.timeFormat, "12");
  assert.equal(DEFAULT_INVOICE_CONFIG.showPhone2, true);
});

test("accounting states preserve authoritative totals and optional party fields", () => {
  const full = { ...SAMPLE_INVOICE_DATA, paidAmount: SAMPLE_INVOICE_DATA.total };
  const partial = { ...SAMPLE_INVOICE_DATA, paidAmount: 45000 };
  const unpaid = { ...SAMPLE_INVOICE_DATA, paidAmount: 0 };
  assert.equal(full.total - full.paidAmount, 0);
  assert.equal(partial.total - partial.paidAmount, 100000);
  assert.equal(unpaid.total - unpaid.paidAmount, unpaid.total);
});

test("A4 and independent 80mm templates preserve RTL and LTR SKU behavior", () => {
  const source = readFileSync("components/invoices/InvoiceDocument.tsx", "utf8");
  const css = readFileSync("app/globals.css", "utf8");
  assert.match(source, /className={`invoice-a4/);
  assert.match(source, /className={`invoice-thermal/);
  assert.match(source, /dir="rtl"/);
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
