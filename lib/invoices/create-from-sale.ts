import type { PaymentMethod, Prisma } from "@/app/generated/prisma/client";

type Tx = Prisma.TransactionClient;

type SaleForInvoice = {
  id: string;
  invoiceNo: string;
  customerId: string;
  warehouseId: string;
  companyId: string;
  saleDate: Date;
  subtotal: Prisma.Decimal | number;
  discount: Prisma.Decimal | number;
  tax: Prisma.Decimal | number;
  total: Prisma.Decimal | number;
  notes: string | null;
  paymentMethod: PaymentMethod;
  customer: {
    name: string;
    code: string;
    phone: string | null;
    email: string | null;
    address: string | null;
  };
  warehouse: {
    name: string;
    code: string;
  };
  items: Array<{
    productId: string;
    quantity: Prisma.Decimal | number;
    unitPrice: Prisma.Decimal | number;
    total: Prisma.Decimal | number;
    product: { name: string; sku: string };
  }>;
};

export type CompanySnapshot = {
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  website: string | null;
  logo: string | null;
  taxNumber?: string | null;
  invoiceHeader?: string | null;
  invoiceFooter?: string | null;
  signature?: string | null;
  stamp?: string | null;
};

type Actor = {
  id: string;
  fullName: string;
} | null;

/**
 * Create a permanent Invoice snapshot from a completed Sale.
 * Must run inside the same transaction as sale creation when possible.
 */
export async function createInvoiceFromSale(
  tx: Tx,
  sale: SaleForInvoice,
  company: CompanySnapshot,
  actor: Actor,
  templateId?: string | null
) {
  const now = new Date();

  return tx.invoice.create({
    data: {
      invoiceNo: sale.invoiceNo,
      saleId: sale.id,
      companyId: sale.companyId,
      customerId: sale.customerId,
      warehouseId: sale.warehouseId,
      templateId: templateId || null,
      createdById: actor?.id || null,
      createdByName: actor?.fullName || null,
      companyName: company.name,
      companyEmail: company.email,
      companyPhone: company.phone,
      companyAddress: company.address,
      companyWebsite: company.website,
      companyLogo: company.logo,
      companyTaxNumber: company.taxNumber || null,
      companyInvoiceHeader: company.invoiceHeader || null,
      companyInvoiceFooter: company.invoiceFooter || null,
      companySignature: company.signature || null,
      companyStamp: company.stamp || null,
      customerName: sale.customer.name,
      customerCode: sale.customer.code,
      customerPhone: sale.customer.phone,
      customerEmail: sale.customer.email,
      customerAddress: sale.customer.address,
      warehouseName: sale.warehouse.name,
      warehouseCode: sale.warehouse.code,
      subtotal: sale.subtotal,
      discount: sale.discount,
      tax: sale.tax,
      grandTotal: sale.total,
      paymentMethod: sale.paymentMethod,
      notes: sale.notes,
      invoiceDate: sale.saleDate,
      invoiceTime: now,
      status: "ACTIVE",
      items: {
        create: sale.items.map((item) => ({
          productId: item.productId,
          productName: item.product.name,
          productSku: item.product.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
        })),
      },
    },
    include: {
      items: true,
    },
  });
}
