import { z } from "zod";
import { currencySchema } from "@/lib/validators/sale";
import {
  erpNumber,
  erpPositiveNumber,
  optionalEntityId,
  optionalTrimmedText,
} from "@/lib/validators/erp-normalization";

export const purchaseItemSchema = z.object({
  productId: z.string().min(1, "بەرهەم پێویستە"),
  quantity: erpPositiveNumber("بڕ دەبێت لە سفر گەورەتر بێت"),
  unitPrice: erpNumber("نرخ نابێت نەرێنی بێت"),
  total: erpNumber("کۆ نابێت نەرێنی بێت").optional(),
  currency: currencySchema,
});

export const createPurchaseSchema = z
  .object({
    /** Empty → walk-in supplier */
    supplierId: optionalEntityId,
    warehouseId: z.string().min(1, "کۆگا پێویستە"),
    purchaseDate: z.coerce.date(),
    discount: erpNumber("داشکاندن نابێت نەرێنی بێت").default(0),
    tax: erpNumber("باج نابێت نەرێنی بێت").default(0),
    notes: optionalTrimmedText,
    items: z.array(purchaseItemSchema).min(1, "لانیکەم یەک بەرهەم پێویستە"),
  })
  .superRefine((data, ctx) => {
    const ids = new Set<string>();
    const currencies = new Set<string>();
    let subtotal = 0;
    for (const [index, item] of data.items.entries()) {
      if (ids.has(item.productId)) ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "هەمان بەرهەم نابێت دوو جار زیاد بکرێت.",
        path: ["items", index, "productId"],
      });
      ids.add(item.productId);
      currencies.add(item.currency);
      subtotal += item.quantity * item.unitPrice;
    }
    if (currencies.size > 1) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "هەموو دێڕەکان دەبێت یەک دراو بەکاربهێنن.", path: ["items"] });
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
