import { z } from "zod";
import {
  erpNumber,
  erpPositiveNumber,
  optionalEntityId,
  optionalTrimmedText,
} from "@/lib/validators/erp-normalization";

export const currencySchema = z.enum(["IQD", "USD"]).default("IQD");

export const saleItemSchema = z.object({
  productId: z.string().min(1, "بەرهەم پێویستە"),
  quantity: erpPositiveNumber("بڕ دەبێت لە سفر گەورەتر بێت"),
  unitPrice: erpNumber("نرخ نابێت نەرێنی بێت"),
  discount: erpNumber("داشکاندنی دێڕ نابێت نەرێنی بێت").default(0),
  // Accepted for backwards compatibility, but never trusted by the server.
  total: erpNumber("کۆ نابێت نەرێنی بێت").optional(),
  currency: currencySchema,
});

export const createSaleSchema = z
  .object({
    /** Empty / omitted → walk-in customer */
    customerId: optionalEntityId,
    warehouseId: z.string().min(1, "کۆگا پێویستە"),
    saleDate: z.coerce.date(),
    discount: erpNumber("داشکاندن نابێت نەرێنی بێت").default(0),
    paidAmount: erpNumber("پارەی دراو نابێت نەرێنی بێت"),
    tax: erpNumber("باج نابێت نەرێنی بێت").default(0),
    notes: optionalTrimmedText,
    paymentMethod: z
      .enum(["CASH", "CARD", "TRANSFER", "CREDIT", "DIGITAL", "OTHER"])
      .default("CASH"),
    items: z.array(saleItemSchema).min(1, "لانیکەم یەک بەرهەم پێویستە"),
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
      const gross = item.quantity * item.unitPrice;
      if (item.discount > gross) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "داشکاندنی دێڕ لە کۆی دێڕ زیاترە.", path: ["items", index, "discount"] });
      subtotal += gross - item.discount;
    }
    if (currencies.size > 1) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "هەموو دێڕەکان دەبێت یەک دراو بەکاربهێنن.", path: ["items"] });
    if (subtotal - data.discount + data.tax < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "کۆی گشتی نادروستە.",
        path: ["discount"],
      });
    }
    if (data.paidAmount > subtotal - data.discount + data.tax) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "پارەی دراو لە کۆی کۆتایی زیاترە.", path: ["paidAmount"] });
  });

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type SaleItemInput = z.infer<typeof saleItemSchema>;
