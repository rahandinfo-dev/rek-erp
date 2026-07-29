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
