export type InvoiceSizeOption = "A4" | "THERMAL" | "RECEIPT";
export type InvoiceDocTypeOption = "SALE" | "PURCHASE" | "GENERIC";

export type InvoiceTemplateConfig = {
  showLogo: boolean;
  showCompanyName: boolean;
  showPhone: boolean;
  showPhone2: boolean;
  showEmail: boolean;
  showWebsite: boolean;
  showAddress: boolean;
  headerText: string;
  footerText: string;
  primaryColor: string;
  accentColor: string;
  textColor: string;
  backgroundColor: string;
  fontFamily: string;
  fontSize: number;
  watermarkEnabled: boolean;
  watermarkText: string;
  watermarkOpacity: number;
  barcodeEnabled: boolean;
  qrEnabled: boolean;
  termsEnabled: boolean;
  termsText: string;
  signatureEnabled: boolean;
  signatureLabel: string;
  signatureImage: string | null;
  stampEnabled: boolean;
  stampImage: string | null;
  showSku: boolean;
  showDiscount: boolean;
  showTax: boolean;
  showUnit: boolean;
  showNotes: boolean;
  showSignatures: boolean;
  showPrintedBy: boolean;
  showPrintedAt: boolean;
  companySubtitle: string;
  addressOverride: string;
  phone1: string;
  phone2: string;
  documentPrefix: string;
  timeFormat: "12" | "24";
  dateFormat: "DD/MM/YYYY" | "YYYY/MM/DD" | "MM/DD/YYYY";
  showCustomerCode: boolean;
  showCustomerPhone: boolean;
  showCustomerAddress: boolean;
  showCustomerHeading: boolean;
  customerHeading: string;
  disclaimerEnabled: boolean;
  disclaimerText: string;
  titleFontFamily: string;
  numericFontFamily: string;
  thankYouText: string;
  labels: InvoiceLabels;
};

export type InvoiceLabels = {
  customerCode: string; customerName: string; customerPhone: string; customerAddress: string;
  invoiceNo: string; date: string; time: string; cashier: string; warehouse: string; reference: string;
  row: string; sku: string; product: string; quantity: string; unit: string; unitPrice: string; discount: string; tax: string; lineTotal: string;
  subtotal: string; additionalCharges: string; grandTotal: string; paid: string; remaining: string; signature: string; customerSignature: string;
};

export const DEFAULT_INVOICE_CONFIG: InvoiceTemplateConfig = {
  showLogo: true,
  showCompanyName: true,
  showPhone: true,
  showPhone2: true,
  showEmail: true,
  showWebsite: true,
  showAddress: true,
  headerText: "پسوولەی فرۆشتن",
  footerText: "سوپاس بۆ بازرگانیکردنتان",
  primaryColor: "#FFAE42",
  accentColor: "#FFF8EF",
  textColor: "#0f172a",
  backgroundColor: "#ffffff",
  fontFamily: "NRT, Tahoma, Arial, sans-serif",
  fontSize: 12,
  watermarkEnabled: false,
  watermarkText: "REK",
  watermarkOpacity: 0.08,
  barcodeEnabled: true,
  qrEnabled: true,
  termsEnabled: true,
  termsText: "کاڵا گەڕێنرێتەوە لە ماوەی ٧ ڕۆژدا بە مەرجی پاراستنی بارودۆخ.",
  signatureEnabled: true,
  signatureLabel: "واژوو",
  signatureImage: null,
  stampEnabled: true,
  stampImage: null,
  showSku: true,
  showDiscount: true,
  showTax: true,
  showUnit: true,
  showNotes: true,
  showSignatures: true,
  showPrintedBy: true,
  showPrintedAt: true,
  companySubtitle: "",
  addressOverride: "",
  phone1: "",
  phone2: "",
  documentPrefix: "",
  timeFormat: "12",
  dateFormat: "DD/MM/YYYY",
  showCustomerCode: true,
  showCustomerPhone: true,
  showCustomerAddress: true,
  showCustomerHeading: false,
  customerHeading: "زانیاری کڕیار",
  disclaimerEnabled: true,
  disclaimerText: "هەڵە و لەبیرچوون دەگەڕێتەوە بۆ هەردوو لا.",
  titleFontFamily: "NRT, Tahoma, Arial, sans-serif",
  numericFontFamily: "Tahoma, Arial, sans-serif",
  thankYouText: "سوپاس بۆ بازرگانیکردنتان",
  labels: {
    customerCode: "کۆدی کڕیار", customerName: "ناوی کڕیار", customerPhone: "ژ. مۆبایل", customerAddress: "ناونیشان",
    invoiceNo: "ژ.پسوولە", date: "بەروار", time: "کاتژمێر", cashier: "کاشێر", warehouse: "کۆگا", reference: "سەرچاوە",
    row: "ژ", sku: "کۆد", product: "ناوی بەرهەم", quantity: "بڕ", unit: "یەکە", unitPrice: "نرخ", discount: "داشکاندن", tax: "باج", lineTotal: "کۆی گشتی",
    subtotal: "کۆی گشتی", additionalCharges: "خەرجی زیادە", grandTotal: "کۆی کۆتایی", paid: "پارەی دراو", remaining: "پارەی ماوە / باقی", signature: "واژووی فرۆشیار", customerSignature: "واژووی کڕیار",
  },
};

export type InvoicePreviewData = {
  mode?: "SALE" | "PURCHASE";
  invoiceNo: string;
  date: string;
  time?: string;
  customerOrSupplier: string;
  customerCode?: string;
  customerPhone?: string | null;
  customerAddress?: string | null;
  currency: string;
  paidAmount?: number;
  additionalCharges?: number;
  warehouse: string;
  notes?: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod?: string;
  createdBy?: string | null;
  items: Array<{
    name: string;
    sku?: string;
    quantity: number;
    unit?: string;
    discount?: number;
    tax?: number;
    unitPrice: number;
    total: number;
  }>;
};

// Fixed demo values: evaluating the clock at module load produces a different
// date/time on the server bundle than in the browser bundle, which would break
// hydration of the template preview.
export const SAMPLE_INVOICE_DATA: InvoicePreviewData = {
  invoiceNo: "SAL-DEMO-001",
  date: "01/01/2025",
  time: "09:00",
  customerOrSupplier: "کڕیاری نموونەیی",
  warehouse: "کۆگای سەرەکی",
  customerCode: "C-001", customerPhone: "0750 000 0000", customerAddress: "هەولێر، شەقامی ١٠٠ مەتری", currency: "IQD", paidAmount: 125000, additionalCharges: 0,
  notes: "تێبینی نموونەیی",
  subtotal: 150000,
  discount: 5000,
  tax: 0,
  total: 145000,
  paymentMethod: "نەقد",
  createdBy: "بەڕێوەبەر",
  items: [
    {
      name: "بەرهەمی یەکەم",
      sku: "SKU-001",
      quantity: 2,
      unitPrice: 50000,
      total: 100000,
    },
    {
      name: "بەرهەمی دووەم بە ناوێکی درێژ بۆ تاقیکردنەوەی ڕیزبەندی و پێچانەوەی دەق",
      sku: "SKU-002",
      quantity: 1,
      unitPrice: 50000,
      total: 50000,
    },
    { name: "بەرهەمی سێیەم", sku: "SKU-LTR-003", quantity: 3, unit: "دانە", unitPrice: 10000, total: 30000 },
  ],
};
