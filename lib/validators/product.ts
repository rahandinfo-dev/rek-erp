import { z } from "zod";

const nonNegNumber = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === "" || value == null) return 0;
    const n = typeof value === "number" ? value : Number(value);
    return Number.isFinite(n) ? n : 0;
  })
  .pipe(z.number().nonnegative("ژمارە نابێت نەرێنی بێت."));

export const productSchema = z.object({
  name: z.string().min(2, "ناوی بەرهەم پێویستە."),
  /** Optional on create — generated automatically after save. */
  sku: z
    .union([z.string(), z.literal(""), z.null(), z.undefined()])
    .transform((v) => (typeof v === "string" ? v.trim() : ""))
    .pipe(z.string()),
  barcode: z.string().optional(),
  unitId: z.string().min(1, "یەکە هەڵبژێرە."),
  /** Required on create so stock lands in a real warehouse. */
  warehouseId: z.string().optional(),
  purchasePrice: nonNegNumber,
  costPrice: nonNegNumber,
  salePrice: nonNegNumber,
  profitMargin: nonNegNumber,
  currentStock: nonNegNumber,
  reservedStock: nonNegNumber,
  /** UI label: Warehouse Alert */
  minimumStock: nonNegNumber,
  maximumStock: nonNegNumber,
  notes: z.string().optional(),
  active: z.boolean(),
  image: z.string().optional(),
});

export const productCreateSchema = productSchema.extend({
  warehouseId: z.string().min(1, "کۆگا هەڵبژێرە."),
});

export const productUpdateSchema = productSchema.extend({
  sku: z.string().min(1, "SKU پێویستە."),
});

export type ProductFormValues = z.output<typeof productSchema>;
export type ProductFormInput = z.input<typeof productSchema>;
export type ProductCreateValues = z.output<typeof productCreateSchema>;
export type ProductCreateInput = z.input<typeof productCreateSchema>;

/** Normalize optional string fields before Prisma writes. */
export function normalizeProductPayload(data: ProductFormValues) {
  return {
    ...data,
    barcode: data.barcode?.trim() || undefined,
    notes: data.notes?.trim() || undefined,
    image: data.image?.trim() || undefined,
    sku: data.sku?.trim() || "",
    warehouseId: data.warehouseId?.trim() || undefined,
  };
}

export function calcProfitMargin(purchase: number, sale: number) {
  if (!(purchase > 0)) return 0;
  return Math.round(((sale - purchase) / purchase) * 10000) / 100;
}

export function calcProfitAmount(purchase: number, sale: number) {
  return Math.round((sale - purchase) * 100) / 100;
}
