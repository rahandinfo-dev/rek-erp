import assert from "node:assert/strict";
import test from "node:test";
import { mapInvoiceToPreview, mapPurchaseToPreview } from "./map-preview.ts";

test("sale invoice payload preserves every persisted transaction amount", () => {
  const preview = mapInvoiceToPreview({
    invoiceNo: "SAL-REAL-42", invoiceDate: "2026-08-02T08:30:00Z", invoiceTime: "2026-08-02T08:31:00Z",
    customerName: "کڕیار", customerCode: "C42", customerPhone: "0750", customerAddress: "هەولێر",
    warehouseName: "کۆگا", notes: null, subtotal: "232.50", discount: "12.50", tax: "5.00",
    grandTotal: "225.00", paidAmount: "125.00", remainingBalance: "100.00", paymentMethod: "CASH", createdByName: "کاشێر",
    items: [{ productName: "بەرهەم", productSku: "SKU42", unit: "دانە", currency: "IQD", quantity: "2.50", unitPrice: "100.00", discount: "17.50", tax: "0.00", total: "232.50" }],
  });
  assert.deepEqual({ subtotal: preview.subtotal, discount: preview.discount, total: preview.total, paid: preview.paidAmount, balance: preview.remainingBalance },
    { subtotal: 232.5, discount: 12.5, total: 225, paid: 125, balance: 100 });
  assert.deepEqual(preview.items[0], { name: "بەرهەم", sku: "SKU42", unit: "دانە", currency: "IQD", quantity: 2.5, unitPrice: 100, discount: 17.5, tax: 0, total: 232.5 });
});

test("purchase payload uses persisted snapshots and never a current Product", () => {
  const preview = mapPurchaseToPreview({
    invoiceNo: "PUR-REAL-9", purchaseDate: "2026-08-02T09:00:00Z", createdAt: "2026-08-02T09:01:00Z",
    supplier: { name: "دابینکەر", code: "S9", phone: null, address: null }, warehouse: { name: "کۆگا" }, notes: null,
    subtotal: "540", discount: "40", tax: "0", total: "500", paidAmount: "300", remainingBalance: "200",
    items: [{ productNameSnapshot: "ناوی کاتی کڕین", productSkuSnapshot: "OLD-SKU", unitSnapshot: "کارتۆن", currency: "USD", quantity: "3", unitPrice: "200", discount: "60", total: "540" }],
  });
  assert.equal(preview.items[0]?.name, "ناوی کاتی کڕین");
  assert.deepEqual({ unitPrice: preview.items[0]?.unitPrice, quantity: preview.items[0]?.quantity, unit: preview.items[0]?.unit, lineDiscount: preview.items[0]?.discount, lineTotal: preview.items[0]?.total, subtotal: preview.subtotal, discount: preview.discount, paid: preview.paidAmount, balance: preview.remainingBalance, grandTotal: preview.total },
    { unitPrice: 200, quantity: 3, unit: "کارتۆن", lineDiscount: 60, lineTotal: 540, subtotal: 540, discount: 40, paid: 300, balance: 200, grandTotal: 500 });
});
