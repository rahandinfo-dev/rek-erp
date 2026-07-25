export const NUMBERING_MODULES = [
  "products",
  "barcodes",
  "sales",
  "purchases",
  "invoices",
  "quotations",
  "customers",
  "suppliers",
  "warehouses",
  "employees",
  "expenses",
  "returns",
  "payments",
] as const;

export type NumberingModule = (typeof NUMBERING_MODULES)[number];

export type ResetPolicy = "none" | "yearly" | "monthly";

export type NumberingRuleView = {
  moduleKey: NumberingModule | string;
  enabled: boolean;
  format: string;
  prefix: string;
  suffix: string;
  moduleCode: string;
  padLength: number;
  startFrom: number;
  resetPolicy: ResetPolicy;
  fiscalYearStartMonth: number;
  allowManualOverride: boolean;
  preview?: string;
  nextValue?: number;
};

export type GenerateContext = {
  companyId: string;
  companyCode?: string | null;
  warehouseCode?: string | null;
  /** Optional manual override — validated for uniqueness by caller */
  override?: string | null;
  /** When true, preview without consuming a sequence */
  previewOnly?: boolean;
  now?: Date;
};

export const MODULE_LABELS: Record<string, string> = {
  products: "Products (SKU)",
  barcodes: "Barcodes",
  sales: "Sales",
  purchases: "Purchases",
  invoices: "Invoices",
  quotations: "Quotations",
  customers: "Customers",
  suppliers: "Suppliers",
  warehouses: "Warehouses",
  employees: "Employees",
  expenses: "Expenses",
  returns: "Returns",
  payments: "Payments",
};

export const DEFAULT_RULES: Record<
  NumberingModule,
  Omit<NumberingRuleView, "preview" | "nextValue">
> = {
  products: {
    moduleKey: "products",
    enabled: true,
    format: "SKU-{COMPANY}-{SEQ:6}",
    prefix: "SKU",
    suffix: "",
    moduleCode: "PRD",
    padLength: 6,
    startFrom: 1,
    resetPolicy: "none",
    fiscalYearStartMonth: 1,
    allowManualOverride: true,
  },
  barcodes: {
    moduleKey: "barcodes",
    enabled: true,
    format: "{COMPANY}{SEQ:10}",
    prefix: "",
    suffix: "",
    moduleCode: "BC",
    padLength: 10,
    startFrom: 1,
    resetPolicy: "none",
    fiscalYearStartMonth: 1,
    allowManualOverride: true,
  },
  sales: {
    moduleKey: "sales",
    enabled: true,
    // Sale invoiceNo is also the invoice document number today
    format: "INV-{YYYY}-{SEQ:6}",
    prefix: "INV",
    suffix: "",
    moduleCode: "SAL",
    padLength: 6,
    startFrom: 1,
    resetPolicy: "yearly",
    fiscalYearStartMonth: 1,
    allowManualOverride: true,
  },
  purchases: {
    moduleKey: "purchases",
    enabled: true,
    format: "PUR-{YYYY}-{SEQ:6}",
    prefix: "PUR",
    suffix: "",
    moduleCode: "PUR",
    padLength: 6,
    startFrom: 1,
    resetPolicy: "yearly",
    fiscalYearStartMonth: 1,
    allowManualOverride: true,
  },
  invoices: {
    moduleKey: "invoices",
    enabled: true,
    format: "INV-{YYYY}-{SEQ:6}",
    prefix: "INV",
    suffix: "",
    moduleCode: "INV",
    padLength: 6,
    startFrom: 1,
    resetPolicy: "yearly",
    fiscalYearStartMonth: 1,
    allowManualOverride: true,
  },
  quotations: {
    moduleKey: "quotations",
    enabled: true,
    format: "QUO-{YYYY}-{SEQ:6}",
    prefix: "QUO",
    suffix: "",
    moduleCode: "QUO",
    padLength: 6,
    startFrom: 1,
    resetPolicy: "yearly",
    fiscalYearStartMonth: 1,
    allowManualOverride: true,
  },
  customers: {
    moduleKey: "customers",
    enabled: true,
    format: "CUS-{SEQ:6}",
    prefix: "CUS",
    suffix: "",
    moduleCode: "CUS",
    padLength: 6,
    startFrom: 1,
    resetPolicy: "none",
    fiscalYearStartMonth: 1,
    allowManualOverride: true,
  },
  suppliers: {
    moduleKey: "suppliers",
    enabled: true,
    format: "SUP-{SEQ:6}",
    prefix: "SUP",
    suffix: "",
    moduleCode: "SUP",
    padLength: 6,
    startFrom: 1,
    resetPolicy: "none",
    fiscalYearStartMonth: 1,
    allowManualOverride: true,
  },
  warehouses: {
    moduleKey: "warehouses",
    enabled: true,
    format: "WH-{SEQ:4}",
    prefix: "WH",
    suffix: "",
    moduleCode: "WH",
    padLength: 4,
    startFrom: 1,
    resetPolicy: "none",
    fiscalYearStartMonth: 1,
    allowManualOverride: true,
  },
  employees: {
    moduleKey: "employees",
    enabled: true,
    format: "EMP-{SEQ:5}",
    prefix: "EMP",
    suffix: "",
    moduleCode: "EMP",
    padLength: 5,
    startFrom: 1,
    resetPolicy: "none",
    fiscalYearStartMonth: 1,
    allowManualOverride: true,
  },
  expenses: {
    moduleKey: "expenses",
    enabled: true,
    format: "EXP-{YYYY}-{SEQ:6}",
    prefix: "EXP",
    suffix: "",
    moduleCode: "EXP",
    padLength: 6,
    startFrom: 1,
    resetPolicy: "yearly",
    fiscalYearStartMonth: 1,
    allowManualOverride: true,
  },
  returns: {
    moduleKey: "returns",
    enabled: true,
    format: "RET-{YYYY}-{SEQ:6}",
    prefix: "RET",
    suffix: "",
    moduleCode: "RET",
    padLength: 6,
    startFrom: 1,
    resetPolicy: "yearly",
    fiscalYearStartMonth: 1,
    allowManualOverride: true,
  },
  payments: {
    moduleKey: "payments",
    enabled: true,
    format: "PAY-{YYYY}-{SEQ:6}",
    prefix: "PAY",
    suffix: "",
    moduleCode: "PAY",
    padLength: 6,
    startFrom: 1,
    resetPolicy: "yearly",
    fiscalYearStartMonth: 1,
    allowManualOverride: true,
  },
};
