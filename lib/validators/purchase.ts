import { z } from "zod";
import { currencySchema } from "@/lib/validators/sale";

export const purchaseItemSchema = z.object({
  productId: z.string().min(1, "بەرهەم پێویستە"),
  quantity: z.number().positive("بڕ دەبێت لە سفر گەورەتر بێت"),
  unitPrice: z.number().min(0, "نرخ نابێت نەرێنی بێت"),
  total: z.number().min(0, "کۆ نابێت نەرێنی بێت"),
  currency: currencySchema,
});

export const createPurchaseSchema = z
  .object({
    /** Empty → walk-in supplier */
    supplierId: z
      .union([z.string(), z.literal(""), z.null(), z.undefined()])
      .transform((v) => (typeof v === "string" ? v.trim() : ""))
      .pipe(z.string()),
    warehouseId: z.string().min(1, "کۆگا پێویستە"),
    purchaseDate: z.coerce.date(),
    discount: z.number().min(0).default(0),
    tax: z.number().min(0).default(0),
    notes: z.string().optional(),
    items: z.array(purchaseItemSchema).min(1, "لانیکەم یەک بەرهەم پێویستە"),
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

export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;
export type PurchaseItemInput = z.infer<typeof purchaseItemSchema>;
