export type InvoiceSizeOption = "A4" | "THERMAL" | "RECEIPT";
export type InvoiceDocTypeOption = "SALE" | "PURCHASE" | "GENERIC";

export type InvoiceTemplateConfig = {
  showLogo: boolean;
  showCompanyName: boolean;
  showPhone: boolean;
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
};

export const DEFAULT_INVOICE_CONFIG: InvoiceTemplateConfig = {
  showLogo: true,
  showCompanyName: true,
  showPhone: true,
  showEmail: true,
  showWebsite: true,
  showAddress: true,
  headerText: "پسوولەی فرۆشتن",
  footerText: "سوپاس بۆ بازرگانیکردنتان",
  primaryColor: "#FFAE42",
  accentColor: "#FFF8EF",
  textColor: "#0f172a",
  backgroundColor: "#ffffff",
  fontFamily: "Rudaw, Tahoma, sans-serif",
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
};

export type InvoicePreviewData = {
  invoiceNo: string;
  date: string;
  time?: string;
  customerOrSupplier: string;
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
      name: "بەرهەمی دووەم",
      sku: "SKU-002",
      quantity: 1,
      unitPrice: 50000,
      total: 50000,
    },
  ],
};
