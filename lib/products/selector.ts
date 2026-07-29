export type ProductSelectorItem = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  salePrice: string | number;
  purchasePrice: string | number;
  currentStock: string | number;
  reservedStock: string | number;
  active: boolean;
};

export type ProductSelectorResponse = {
  success: boolean;
  data?: ProductSelectorItem[];
  productSelectorDebug?: boolean;
};

let debugEnabled = false;

export function isProductSelectorDebugEnabled() {
  return debugEnabled;
}

export function mapActiveProductOptions(
  response: ProductSelectorResponse
): ProductSelectorItem[] {
  debugEnabled = response.productSelectorDebug === true;
  const source = response.success && Array.isArray(response.data) ? response.data : [];
  const mapped = source.filter((product) => product.active === true);

  if (isProductSelectorDebugEnabled()) {
    console.info("[PRODUCT_SELECTOR_DEBUG] STEP 5 Frontend fetch count", source.length);
    console.info("[PRODUCT_SELECTOR_DEBUG] STEP 6 Mapping count", mapped.length);
  }

  return mapped;
}

export function filterProductOptions(
  products: ProductSelectorItem[],
  query: string,
  limit = 40
) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const matches = normalizedQuery
    ? products.filter((product) =>
        [product.name, product.sku, product.barcode]
          .filter((value): value is string => typeof value === "string")
          .some((value) => value.toLocaleLowerCase().includes(normalizedQuery))
      )
    : products;

  return matches.slice(0, limit);
}
