import { z } from "zod";
import { DEFAULT_INVOICE_CONFIG } from "@/lib/invoices/template-config";

export const invoiceTemplateConfigSchema = z.object({
  showLogo: z.boolean(),
  showCompanyName: z.boolean(),
  showPhone: z.boolean(),
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
});

export const invoiceTemplateSchema = z.object({
  name: z.string().min(2, "ناوی قاڵب پێویستە."),
  isDefault: z.boolean().default(false),
  size: z.enum(["A4", "THERMAL", "RECEIPT"]),
  docType: z.enum(["SALE", "PURCHASE", "GENERIC"]),
  config: invoiceTemplateConfigSchema.default(DEFAULT_INVOICE_CONFIG),
});

export type InvoiceTemplateInput = z.infer<typeof invoiceTemplateSchema>;
