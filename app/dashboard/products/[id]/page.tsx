import { notFound } from "next/navigation";
import { db } from "@/lib/prisma/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getCachedMainWarehouse } from "@/lib/cache/company-reads";
import ProductDetails from "@/components/products/ProductDetails";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ProductDetailsPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { id } = await params;

  const [product, mainWarehouse, units, warehouseBalances] = await Promise.all([
    db.product.findFirst({
      where: { id, companyId: user.companyId, deletedAt: null },
      select: {
        id: true,
        name: true,
        sku: true,
        barcode: true,
        image: true,
        notes: true,
        active: true,
        unitId: true,
        purchasePrice: true,
        costPrice: true,
        salePrice: true,
        profitMargin: true,
        currentStock: true,
        reservedStock: true,
        minimumStock: true,
        maximumStock: true,
        createdAt: true,
        updatedAt: true,
        unit: { select: { id: true, name: true, symbol: true } },
      },
    }),
    getCachedMainWarehouse(user.companyId),
    db.unit.findMany({
      where: {
        companyId: user.companyId,
        active: true,
      },
      select: { id: true, name: true, symbol: true },
      orderBy: { name: "asc" },
    }),
    db.warehouseStock.findMany({
      where: { productId: id, companyId: user.companyId },
      select: {
        quantity: true,
        reserved: true,
        warehouse: {
          select: { id: true, name: true, isMain: true },
        },
      },
      orderBy: { warehouse: { isMain: "desc" } },
    }),
  ]);

  if (!product) notFound();

  const unitOptions = units.some((u) => u.id === product.unitId)
    ? units
    : [
        {
          id: product.unit.id,
          name: product.unit.name,
          symbol: product.unit.symbol,
        },
        ...units,
      ];

  return (
    <ProductDetails
      product={{
        id: product.id,
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        image: product.image,
        notes: product.notes,
        active: product.active,
        purchasePrice: Number(product.purchasePrice),
        costPrice: Number(product.costPrice),
        salePrice: Number(product.salePrice),
        profitMargin: Number(product.profitMargin),
        currentStock: Number(product.currentStock),
        reservedStock: Number(product.reservedStock),
        minimumStock: Number(product.minimumStock),
        maximumStock: Number(product.maximumStock),
        unitId: product.unitId,
        unit: product.unit,
        warehouseName: mainWarehouse?.name || "کۆگا",
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
      }}
      units={unitOptions}
      warehouseBalances={warehouseBalances.map((row) => ({
        warehouseId: row.warehouse.id,
        warehouseName: row.warehouse.name,
        quantity: Number(row.quantity),
        reserved: Number(row.reserved),
        isMain: row.warehouse.isMain,
      }))}
    />
  );
}
