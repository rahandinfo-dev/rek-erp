import { z } from "zod";
import { DEFAULT_INVOICE_CONFIG } from "@/lib/invoices/template-config";

export const invoiceTemplateConfigSchema = z.object({
  showLogo: z.boolean(),
  showCompanyName: z.boolean(),
  showPhone: z.boolean(),
  showPhone2: z.boolean(),
  showEmail: z.boolean(),
  showWebsite: z.boolean(),
  showAddress: z.boolean(),
  headerText: z.string(),
  footerText: z.string(),
  primaryColor: z.string().min(4),
  accentColor: z.string().min(4),
  textColor: z.string().min(4),
  backgroundColor: z.string().min(4),
  fontFamily: z.string().min(1),
  fontSize: z.number().min(8).max(24),
  watermarkEnabled: z.boolean(),
  watermarkText: z.string(),
  watermarkOpacity: z.number().min(0).max(1),
  barcodeEnabled: z.boolean(),
  qrEnabled: z.boolean(),
  termsEnabled: z.boolean(),
  termsText: z.string(),
  signatureEnabled: z.boolean(),
  signatureLabel: z.string(),
  signatureImage: z.string().nullable(),
  stampEnabled: z.boolean(),
  stampImage: z.string().nullable(),
  showSku: z.boolean(), showDiscount: z.boolean(), showTax: z.boolean(), showSignatures: z.boolean(),
  showPrintedBy: z.boolean(), showPrintedAt: z.boolean(), companySubtitle: z.string(), addressOverride: z.string(), phone1: z.string(), phone2: z.string(), showCustomerCode: z.boolean(), showCustomerPhone: z.boolean(), showCustomerAddress: z.boolean(),
  documentPrefix: z.string().max(3).regex(/^[A-Za-z]*$/), timeFormat: z.enum(["12", "24"]), disclaimerEnabled: z.boolean(), disclaimerText: z.string().max(1000), titleFontFamily: z.string().min(1), numericFontFamily: z.string().min(1), thankYouText: z.string(),
  labels: z.object({
    customerCode: z.string(), customerName: z.string(), customerPhone: z.string(), customerAddress: z.string(),
    invoiceNo: z.string(), date: z.string(), time: z.string(), cashier: z.string(), warehouse: z.string(), reference: z.string(),
    row: z.string(), sku: z.string(), product: z.string(), quantity: z.string(), unit: z.string(), unitPrice: z.string(), discount: z.string(), tax: z.string(), lineTotal: z.string(),
    subtotal: z.string(), additionalCharges: z.string(), grandTotal: z.string(), paid: z.string(), remaining: z.string(), signature: z.string(), customerSignature: z.string(),
  }),
});

export const invoiceTemplateSchema = z.object({
  name: z.string().min(2, "ناوی قاڵب پێویستە."),
  isDefault: z.boolean().default(false),
  size: z.enum(["A4", "THERMAL", "RECEIPT"]),
  docType: z.enum(["SALE", "PURCHASE", "GENERIC"]),
  config: invoiceTemplateConfigSchema.default(DEFAULT_INVOICE_CONFIG),
});

export type InvoiceTemplateInput = z.infer<typeof invoiceTemplateSchema>;
