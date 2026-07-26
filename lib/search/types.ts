export type SearchModuleFilter =
  | "all"
  | "products"
  | "sales"
  | "purchases"
  | "invoices"
  | "customers"
  | "suppliers"
  | "warehouses"
  | "employees"
  | "reports"
  | "settings";

export type SearchPreview = {
  image?: string | null;
  stock?: number | null;
  warehouse?: string | null;
  salePrice?: number | null;
  purchaseCost?: number | null;
  lastSale?: string | null;
  phone?: string | null;
  email?: string | null;
  status?: string | null;
  total?: number | null;
  currency?: string | null;
  notes?: string | null;
  extras?: Array<{ label: string; value: string }>;
};

export type SearchHit = {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  href: string;
  editHref?: string | null;
  type: string;
  module: string;
  updatedAt?: number | null;
  preview?: SearchPreview | null;
  /** Exact barcode/SKU match — client may open immediately */
  exactMatch?: boolean;
};

export type SearchGroup = {
  key: string;
  label: string;
  items: SearchHit[];
};

export type SearchResultPayload = {
  query: string;
  groups: SearchGroup[];
  total: number;
  exactHref?: string | null;
};

export const SEARCH_FILTERS: Array<{
  key: SearchModuleFilter;
  label: string;
}> = [
  { key: "all", label: "هەموو" },
  { key: "products", label: "بەرهەمەکان" },
  { key: "sales", label: "فرۆشتن" },
  { key: "customers", label: "کڕیارەکان" },
  { key: "invoices", label: "پسوولەکان" },
  { key: "warehouses", label: "کۆگاکان" },
  { key: "employees", label: "کارمەندان" },
  { key: "reports", label: "ڕاپۆرتەکان" },
  { key: "purchases", label: "کڕین" },
  { key: "suppliers", label: "دابینکەران" },
  { key: "settings", label: "ڕێکخستنەکان" },
];
