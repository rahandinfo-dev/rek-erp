import { z } from "zod";

export const currencySchema = z.enum(["IQD", "USD"]).default("IQD");

export const saleItemSchema = z.object({
  productId: z.string().min(1, "بەرهەم پێویستە"),
  quantity: z.number().positive("بڕ دەبێت لە سفر گەورەتر بێت"),
  unitPrice: z.number().min(0, "نرخ نابێت نەرێنی بێت"),
  total: z.number().min(0, "کۆ نابێت نەرێنی بێت"),
  currency: currencySchema,
});

export const createSaleSchema = z
  .object({
    /** Empty / omitted → walk-in customer */
    customerId: z
      .union([z.string(), z.literal(""), z.null(), z.undefined()])
      .transform((v) => (typeof v === "string" ? v.trim() : ""))
      .pipe(z.string()),
    warehouseId: z.string().min(1, "کۆگا پێویستە"),
    saleDate: z.coerce.date(),
    discount: z.number().min(0).default(0),
    tax: z.number().min(0).default(0),
    notes: z.string().optional(),
    paymentMethod: z
      .enum(["CASH", "CARD", "TRANSFER", "CREDIT", "DIGITAL", "OTHER"])
      .default("CASH"),
    items: z.array(saleItemSchema).min(1, "لانیکەم یەک بەرهەم پێویستە"),
  })
  .superRefine((data, ctx) => {
    let subtotal = 0;
    for (const item of data.items) {
      const expected = item.quantity * item.unitPrice;
      if (Math.abs(expected - item.total) > 0.01) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "کۆی هێڵ نادروستە.",
          path: ["items"],
        });
      }
      subtotal += item.total;
    }
    if (subtotal - data.discount + data.tax < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "کۆی گشتی نادروستە.",
        path: ["discount"],
      });
    }
  });

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type SaleItemInput = z.infer<typeof saleItemSchema>;
