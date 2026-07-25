/** Server/client-safe QR payload helpers for products & documents. */

export function productQrPayload(input: {
  sku: string;
  barcode?: string | null;
  name?: string;
  companyCode?: string | null;
}) {
  return JSON.stringify({
    type: "product",
    sku: input.sku,
    barcode: input.barcode || input.sku,
    name: input.name || undefined,
    company: input.companyCode || undefined,
  });
}

export function documentQrPayload(input: {
  module: string;
  number: string;
  id?: string;
}) {
  return JSON.stringify({
    type: "document",
    module: input.module,
    number: input.number,
    id: input.id,
  });
}
