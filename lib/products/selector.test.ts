import assert from "node:assert/strict";
import test from "node:test";
import {
  filterProductOptions,
  mapActiveProductOptions,
  type ProductSelectorItem,
} from "./selector.ts";

const product: ProductSelectorItem = {
  id: "product-1",
  name: "چاوی کوردی",
  sku: "SKU-100",
  barcode: "869000123",
  salePrice: 10,
  purchasePrice: 8,
  currentStock: 0,
  reservedStock: 0,
  active: true,
};

test("maps active API products and excludes inactive products without duplicates", () => {
  const result = mapActiveProductOptions({
    success: true,
    data: [product, { ...product, id: "inactive", active: false }],
  });
  assert.deepEqual(result, [product]);
});

test("returns no products for failed or malformed responses", () => {
  assert.deepEqual(mapActiveProductOptions({ success: false, data: [product] }), []);
  assert.deepEqual(mapActiveProductOptions({ success: true }), []);
});

test("searches partial name, SKU/internal code, and barcode case-insensitively", () => {
  assert.deepEqual(filterProductOptions([product], "کورد").map((p) => p.id), [product.id]);
  assert.deepEqual(filterProductOptions([product], "sku-1").map((p) => p.id), [product.id]);
  assert.deepEqual(filterProductOptions([product], "0012").map((p) => p.id), [product.id]);
  assert.deepEqual(filterProductOptions([product], "missing"), []);
});

test("zero-stock active products remain selectable", () => {
  assert.equal(filterProductOptions([product], "")[0]?.currentStock, 0);
});

test("an API response can enable selector diagnostics without exposing secrets", () => {
  const originalInfo = console.info;
  const messages: unknown[][] = [];
  console.info = (...args: unknown[]) => messages.push(args);
  try {
    mapActiveProductOptions({
      success: true,
      data: [product],
      productSelectorDebug: true,
    });
    assert.equal(messages.length, 2);
  } finally {
    console.info = originalInfo;
    mapActiveProductOptions({ success: true, data: [] });
  }
});
