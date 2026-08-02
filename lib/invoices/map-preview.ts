import { PAYMENT_METHOD_LABELS } from "./payment.ts";
import type { InvoicePreviewData } from "./template-config.ts";
import type { PaymentMethod } from "../prisma/client.ts";
import { formatDate, formatTime } from "../utils/datetime.ts";
import { decimalString, type DecimalValue } from "./decimal.ts";

const persisted = (value: unknown) => decimalString(value as DecimalValue);

type InvoiceLike = {
  mode?: "SALE" | "PURCHASE";
  invoiceNo: string;
  invoiceDate: Date | string;
  invoiceTime: Date | string;
  customerName: string;
  customerCode: string;
  customerPhone: string | null;
  customerAddress: string | null;
  currency?: string;
  warehouseName: string;
  notes: string | null;
  subtotal: unknown;
  discount: unknown;
  tax: unknown;
  grandTotal: unknown;
  paidAmount: unknown;
  remainingBalance: unknown;
  paymentMethod: PaymentMethod;
  createdByName: string | null;
  items: Array<{
    productName: string;
    productSku: string | null;
    quantity: unknown;
    unitPrice: unknown;
    total: unknown;
    unit?: string | null;
    currency: string;
    discount: unknown;
    tax?: unknown;
  }>;
};

type PurchaseLike = {
  invoiceNo: string;
  purchaseDate: Date | string;
  createdAt: Date | string;
  supplier: {
    name: string;
    code: string;
    phone: string | null;
    address: string | null;
  };
  warehouse: { name: string };
  notes: string | null;
  subtotal: unknown;
  discount: unknown;
  tax: unknown;
  total: unknown;
  paidAmount: unknown;
  remainingBalance: unknown;
  items: Array<{
    productNameSnapshot: string | null;
    productSkuSnapshot: string | null;
    unitSnapshot: string | null;
    currency: string;
    quantity: unknown;
    unitPrice: unknown;
    total: unknown;
    discount: unknown;
  }>;
};

export function mapInvoiceToPreview(invoice: InvoiceLike): InvoicePreviewData {
  return {
    mode: invoice.mode || "SALE",
    invoiceNo: invoice.invoiceNo,
    date: formatDate(invoice.invoiceDate),
    time: formatTime(invoice.invoiceTime),
    customerOrSupplier: invoice.customerName,
    customerCode: invoice.customerCode,
    customerPhone: invoice.customerPhone,
    customerAddress: invoice.customerAddress,
    currency: invoice.currency ?? invoice.items[0]?.currency ?? "",
    warehouse: invoice.warehouseName,
    notes: invoice.notes,
    subtotal: persisted(invoice.subtotal),
    discount: persisted(invoice.discount),
    tax: persisted(invoice.tax),
    total: persisted(invoice.grandTotal),
    paidAmount: invoice.paidAmount === null ? undefined : persisted(invoice.paidAmount),
    remainingBalance: invoice.remainingBalance === null ? undefined : persisted(invoice.remainingBalance),
    paymentMethod: PAYMENT_METHOD_LABELS[invoice.paymentMethod],
    createdBy: invoice.createdByName,
    items: invoice.items.map((item) => ({
      name: item.productName,
      sku: item.productSku || undefined,
      quantity: persisted(item.quantity),
      unitPrice: persisted(item.unitPrice),
      total: persisted(item.total),
      unit: item.unit || undefined,
      currency: item.currency,
      discount: persisted(item.discount),
      tax: persisted(item.tax ?? 0),
    })),
  };
}

/**
 * Map only immutable purchase fields and the persisted line snapshots.
 * A missing legacy snapshot stays missing rather than silently substituting the
 * product's current name, SKU, or unit (which may have changed after purchase).
 */
export function mapPurchaseToPreview(purchase: PurchaseLike): InvoicePreviewData {
  return {
    mode: "PURCHASE",
    invoiceNo: purchase.invoiceNo,
    date: formatDate(purchase.purchaseDate),
    time: formatTime(purchase.createdAt),
    customerOrSupplier: purchase.supplier.name,
    customerCode: purchase.supplier.code,
    customerPhone: purchase.supplier.phone,
    customerAddress: purchase.supplier.address,
    currency: purchase.items[0]?.currency ?? "",
    warehouse: purchase.warehouse.name,
    notes: purchase.notes,
    subtotal: persisted(purchase.subtotal),
    discount: persisted(purchase.discount),
    tax: persisted(purchase.tax),
    total: persisted(purchase.total),
    paidAmount: purchase.paidAmount === null ? undefined : persisted(purchase.paidAmount),
    remainingBalance: purchase.remainingBalance === null ? undefined : persisted(purchase.remainingBalance),
    items: purchase.items.map((item) => ({
      name: item.productNameSnapshot ?? "—",
      sku: item.productSkuSnapshot ?? undefined,
      unit: item.unitSnapshot ?? undefined,
      quantity: persisted(item.quantity),
      unitPrice: persisted(item.unitPrice),
      total: persisted(item.total),
      discount: persisted(item.discount),
    })),
  };
}
