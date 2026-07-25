import { db } from "@/lib/prisma/db";
import { getCachedMainWarehouse } from "@/lib/cache/company-reads";
import type { ProductCardData } from "@/components/products/ProductCard";

export type ProductsListResult = {
  products: ProductCardData[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

/** Fields required to render product cards + quick actions. */
const PRODUCT_CARD_SELECT = {
  id: true,
  name: true,
  sku: true,
  barcode: true,
  image: true,
  purchasePrice: true,
  salePrice: true,
  costPrice: true,
  profitMargin: true,
  currentStock: true,
  reservedStock: true,
  minimumStock: true,
  maximumStock: true,
  notes: true,
  active: true,
  unitId: true,
  unit: { select: { name: true, symbol: true } },
} as const;

export async function listProductsPage(input: {
  companyId: string;
  q?: string;
  page?: number;
  pageSize?: number;
  active?: "true" | "false" | null;
}): Promise<ProductsListResult> {
  const q = (input.q || "").trim();
  const page = Math.max(1, input.page || 1);
  const pageSize = Math.min(48, Math.max(1, input.pageSize || 12));
  const activeParam = input.active;

  const where = {
    companyId: input.companyId,
    ...(activeParam === "true"
      ? { active: true }
      : activeParam === "false"
        ? { active: false }
        : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { sku: { contains: q, mode: "insensitive" as const } },
            { barcode: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, products, mainWarehouse] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      select: PRODUCT_CARD_SELECT,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    getCachedMainWarehouse(input.companyId),
  ]);

  const warehouseName = mainWarehouse?.name || "کۆگا";
  const warehouseId = mainWarehouse?.id || "";

  return {
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      barcode: p.barcode,
      image: p.image,
      purchasePrice: Number(p.purchasePrice),
      salePrice: Number(p.salePrice),
      costPrice: Number(p.costPrice),
      profitMargin: Number(p.profitMargin),
      currentStock: Number(p.currentStock),
      reservedStock: Number(p.reservedStock),
      minimumStock: Number(p.minimumStock),
      maximumStock: Number(p.maximumStock),
      notes: p.notes,
      active: p.active,
      unitId: p.unitId,
      unit: p.unit,
      warehouseId,
      warehouseName,
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}
