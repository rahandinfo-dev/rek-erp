const FIELD_LABELS: Record<string, string> = {
  name: "Name Changed",
  fullName: "Name Changed",
  title: "Title Changed",
  salePrice: "Price Updated",
  purchasePrice: "Cost Updated",
  purchaseCost: "Cost Updated",
  price: "Price Updated",
  stock: "Stock Modified",
  quantity: "Quantity Modified",
  categoryId: "Category Changed",
  brandId: "Brand Changed",
  unitId: "Unit Changed",
  warehouseId: "Warehouse Changed",
  werehouseId: "Warehouse Changed",
  supplierId: "Supplier Changed",
  customerId: "Customer Changed",
  phone: "Phone Updated",
  email: "Email Updated",
  address: "Address Updated",
  notes: "Notes Updated",
  description: "Description Updated",
  sku: "SKU Updated",
  barcode: "Barcode Updated",
  status: "Status Changed",
  themeColor: "Theme Updated",
  currency: "Currency Changed",
  items: "Line Items Modified",
  filters: "Filters Changed",
  sort: "Sorting Changed",
  page: "Pagination Changed",
  widgets: "Widgets Changed",
  layout: "Layout Changed",
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

/** Build human-readable change bullets from baseline vs current. */
export function buildChangeSummary(
  baseline: unknown,
  current: unknown,
  max = 8
): string[] {
  if (!isPlainObject(baseline) || !isPlainObject(current)) {
    if (!valuesEqual(baseline, current)) return ["Content Modified"];
    return [];
  }

  const keys = new Set([
    ...Object.keys(baseline),
    ...Object.keys(current),
  ]);
  const out: string[] = [];

  for (const key of keys) {
    if (valuesEqual(baseline[key], current[key])) continue;
    const label =
      FIELD_LABELS[key] ||
      `${key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())} Changed`;
    out.push(label);
    if (out.length >= max) break;
  }

  return out;
}
