import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/prisma/db";
import StockTransferClient from "@/components/inventory/StockTransferClient";

export default async function StockTransfersPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [products, warehouses, transfers] = await Promise.all([
    db.product.findMany({
      where: { companyId: user.companyId, active: true },
      select: { id: true, name: true, sku: true },
      orderBy: { name: "asc" },
      take: 500,
    }),
    db.warehouse.findMany({
      where: { companyId: user.companyId },
      select: { id: true, name: true, code: true },
      orderBy: [{ isMain: "desc" }, { name: "asc" }],
    }),
    db.stockTransfer.findMany({
      where: { companyId: user.companyId },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        fromWarehouse: { select: { id: true, name: true, code: true } },
        toWarehouse: { select: { id: true, name: true, code: true } },
        user: { select: { id: true, fullName: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
          },
        },
      },
    }),
  ]);

  return (
    <StockTransferClient
      products={products}
      warehouses={warehouses}
      initialHistory={transfers.map((t) => ({
        id: t.id,
        referenceNo: t.referenceNo,
        date: t.createdAt.toISOString(),
        reason: t.reason,
        notes: t.notes,
        fromWarehouse: t.fromWarehouse,
        toWarehouse: t.toWarehouse,
        user: t.user,
        items: t.items.map((i) => ({
          quantity: Number(i.quantity),
          product: i.product,
        })),
        totalQuantity: t.items.reduce((s, i) => s + Number(i.quantity), 0),
      }))}
    />
  );
}
