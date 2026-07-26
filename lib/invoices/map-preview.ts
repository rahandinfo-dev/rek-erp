import { PAYMENT_METHOD_LABELS } from "@/lib/invoices/payment";
import type { InvoicePreviewData } from "@/lib/invoices/template-config";
import type { PaymentMethod } from "@/lib/prisma/client";
import { formatDate, formatTime } from "@/lib/utils/datetime";

type InvoiceLike = {
  invoiceNo: string;
  invoiceDate: Date | string;
  invoiceTime: Date | string;
  customerName: string;
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
  }>;
};

export function mapInvoiceToPreview(invoice: InvoiceLike): InvoicePreviewData {
  return {
    invoiceNo: invoice.invoiceNo,
    date: formatDate(invoice.invoiceDate),
    time: formatTime(invoice.invoiceTime),
    customerOrSupplier: invoice.customerName,
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
    })),
  };
}
