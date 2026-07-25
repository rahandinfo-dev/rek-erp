import { z } from "zod";

const nonNegativeQty = z
  .union([z.number(), z.string()])
  .transform((value) => {
    const n = typeof value === "number" ? value : Number(value);
    return Number.isFinite(n) ? n : NaN;
  })
  .pipe(z.number().min(0, "بڕ نابێت نەرێنی بێت."));

const positiveQty = z
  .union([z.number(), z.string()])
  .transform((value) => {
    const n = typeof value === "number" ? value : Number(value);
    return Number.isFinite(n) ? n : 0;
  })
  .pipe(z.number().positive("بڕ دەبێت گەورەتر لە سفر بێت."));

/**
 * Stock Adjustment:
 * - increase: add quantity
 * - decrease: remove quantity
 * - correct: set absolute warehouse quantity (manual correction)
 */
export const stockAdjustmentSchema = z
  .object({
    productId: z.string().min(1, "بەرهەم هەڵبژێرە."),
    warehouseId: z.string().min(1, "کۆگا هەڵبژێرە."),
    mode: z.enum(["increase", "decrease", "correct"]),
    /** Delta for increase/decrease; absolute target for correct. */
    quantity: nonNegativeQty,
    reason: z.string().trim().min(2, "هۆکار پێویستە.").max(500),
    notes: z.string().max(1000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.mode === "correct") {
      if (!Number.isFinite(data.quantity) || data.quantity < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["quantity"],
          message: "بڕی نوێ نادروستە.",
        });
      }
      return;
    }
    if (!(data.quantity > 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["quantity"],
        message: "بڕ دەبێت گەورەتر لە سفر بێت.",
      });
    }
  });

export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;

/** @deprecated Use `mode` — kept for older clients mapping direction → mode. */
export const stockAdjustmentLegacySchema = z.object({
  productId: z.string().min(1),
  warehouseId: z.string().min(1),
  direction: z.enum(["increase", "decrease"]),
  quantity: positiveQty,
  reason: z.string().min(2).max(500),
  notes: z.string().max(1000).optional(),
});

export const stockTransferSchema = z.object({
  fromWarehouseId: z.string().min(1, "کۆگای سەرچاوە هەڵبژێرە."),
  toWarehouseId: z.string().min(1, "کۆگای مەبەست هەڵبژێرە."),
  reason: z.string().min(2, "هۆکار پێویستە.").max(500),
  notes: z.string().max(1000).optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: positiveQty,
      })
    )
    .min(1, "لانیکەم یەک بەرهەم پێویستە."),
}).refine((d) => d.fromWarehouseId !== d.toWarehouseId, {
  message: "کۆگای سەرچاوە و مەبەست نابێت یەکسان بن.",
  path: ["toWarehouseId"],
});

export type StockTransferInput = z.infer<typeof stockTransferSchema>;
