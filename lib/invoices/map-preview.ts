import { PAYMENT_METHOD_LABELS } from "@/lib/invoices/payment";
import type { InvoicePreviewData } from "@/lib/invoices/template-config";
import type { PaymentMethod } from "@/lib/prisma/client";
import { formatDate, formatTime } from "@/lib/utils/datetime";

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
  paymentMethod: PaymentMethod;
  createdByName: string | null;
  items: Array<{
    productName: string;
    productSku: string | null;
    quantity: unknown;
    unitPrice: unknown;
    total: unknown;
    unit?: string | null;
    currency?: string;
    discount?: unknown;
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
  items: Array<{
    productNameSnapshot: string | null;
    productSkuSnapshot: string | null;
    unitSnapshot: string | null;
    currency: string;
    quantity: unknown;
    unitPrice: unknown;
    total: unknown;
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
    subtotal: Number(invoice.subtotal),
    discount: Number(invoice.discount),
    tax: Number(invoice.tax),
    total: Number(invoice.grandTotal),
    paymentMethod: PAYMENT_METHOD_LABELS[invoice.paymentMethod],
    createdBy: invoice.createdByName,
    items: invoice.items.map((item) => ({
      name: item.productName,
      sku: item.productSku || undefined,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      total: Number(item.total),
      unit: item.unit || undefined,
      currency: item.currency,
      discount: Number(item.discount ?? 0),
      tax: Number(item.tax ?? 0),
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
    subtotal: Number(purchase.subtotal),
    discount: Number(purchase.discount),
    tax: Number(purchase.tax),
    total: Number(purchase.total),
    items: purchase.items.map((item) => ({
      name: item.productNameSnapshot ?? "—",
      sku: item.productSkuSnapshot ?? undefined,
      unit: item.unitSnapshot ?? undefined,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      total: Number(item.total),
    })),
  };
}
