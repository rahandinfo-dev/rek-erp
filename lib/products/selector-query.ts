import { db } from "@/lib/prisma/db";

export const PRODUCT_SELECTOR_SELECT = {
  id: true,
  name: true,
  sku: true,
  barcode: true,
  salePrice: true,
  purchasePrice: true,
  currentStock: true,
  reservedStock: true,
  active: true,
} as const;

/** Active product options for sales and purchase entry, isolated by company. */
export async function listProductSelectorOptions(companyId: string) {
  if (process.env.PRODUCT_SELECTOR_DEBUG === "true") {
    console.info("[PRODUCT_SELECTOR_DEBUG] STEP 2 Prisma query", {
      companyId,
      active: true,
    });
  }

  const products = await db.product.findMany({
    where: { companyId, active: true, deletedAt: null },
    select: PRODUCT_SELECTOR_SELECT,
    orderBy: [{ name: "asc" }, { id: "asc" }],
  });

  if (process.env.PRODUCT_SELECTOR_DEBUG === "true") {
    console.info("[PRODUCT_SELECTOR_DEBUG] STEP 3 Number of products loaded", products.length);
  }

  return products;
}
