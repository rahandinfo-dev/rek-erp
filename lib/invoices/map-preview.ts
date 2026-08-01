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
    currency: invoice.currency || invoice.items[0]?.currency || "IQD",
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
      discount: Number(item.discount || 0),
      tax: Number(item.tax || 0),
    })),
  };
}
