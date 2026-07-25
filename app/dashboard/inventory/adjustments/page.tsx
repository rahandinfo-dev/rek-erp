import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/prisma/db";
import StockAdjustmentClient from "@/components/inventory/StockAdjustmentClient";

export default async function StockAdjustmentsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [products, warehouses, history] = await Promise.all([
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
    db.inventoryTransaction.findMany({
      where: { companyId: user.companyId, type: "ADJUSTMENT" },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        quantity: true,
        previousQty: true,
        newQty: true,
        reason: true,
        notes: true,
        referenceNo: true,
        createdAt: true,
        product: { select: { id: true, name: true, sku: true } },
        warehouse: { select: { id: true, name: true } },
        user: { select: { id: true, fullName: true } },
      },
    }),
  ]);

  return (
    <StockAdjustmentClient
      products={products}
      warehouses={warehouses}
      initialHistory={history.map((r) => {
        const previousQty = Number(r.previousQty ?? 0);
        const newQty = Number(r.newQty ?? 0);
        return {
          id: r.id,
          quantity: Number(r.quantity),
          previousQty,
          newQty,
          delta: Math.round((newQty - previousQty) * 100) / 100,
          reason: r.reason,
          notes: r.notes,
          referenceNo: r.referenceNo,
          date: r.createdAt.toISOString(),
          product: r.product,
          warehouse: r.warehouse,
          user: r.user,
        };
      })}
    />
  );
}
