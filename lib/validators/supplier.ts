import { z } from "zod";

export const supplierSchema = z.object({
  name: z
    .string()
    .min(2, "ناوی دابینکەر پێویستە."),

  /** Empty → server auto-numbering */
  code: z.string().optional().or(z.literal("")),

  phone: z.string().optional(),

  email: z
    .string()
    .email("ئیمەیڵ دروست نییە.")
    .optional()
    .or(z.literal("")),

  address: z.string().optional(),

  notes: z.string().optional(),

  image: z.string().optional().nullable().or(z.literal("")),

  active: z.boolean(),
});

export type SupplierFormData = z.infer<typeof supplierSchema>;
