import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { notifySafe } from "@/lib/notifications/create";
import {
  applyStockMovement,
  ensureProductWarehouseBalance,
} from "@/lib/inventory/movements";
import { auditSafe } from "@/lib/audit/log";

type Params = {
  params: Promise<{ id: string }>;
};

/** Restore a soft-deleted product and append a permanent RESTORE movement. */
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "تکایە سەرەتا بچۆ ژوورەوە." },
        { status: 401 }
      );
    }

    const { companyId, id: userId } = user;
    const { id } = await params;

    const product = await db.product.findFirst({
      where: { id, companyId },
      select: {
        id: true,
        name: true,
        sku: true,
        active: true,
        currentStock: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, message: "بەرهەم نەدۆزرایەوە." },
        { status: 404 }
      );
    }

    if (product.active) {
      return NextResponse.json(
        { success: false, message: "ئەم بەرهەمە چالاکە." },
        { status: 400 }
      );
    }

    await db.$transaction(async (tx) => {
      await ensureProductWarehouseBalance(tx, companyId, product.id);

      const balances = await tx.warehouseStock.findMany({
        where: { companyId, productId: product.id },
        select: { warehouseId: true, quantity: true },
      });

      const targets =
        balances.length > 0
          ? balances
          : [
              {
                warehouseId: (
                  await tx.warehouse.findFirst({
                    where: { companyId },
                    orderBy: [{ isMain: "desc" }, { createdAt: "asc" }],
                    select: { id: true },
                  })
                )?.id,
                quantity: product.currentStock,
              },
            ];

      for (const bal of targets) {
        if (!bal.warehouseId) continue;
        const qty = Number(bal.quantity ?? 0);
        await applyStockMovement(tx, {
          companyId,
          productId: product.id,
          warehouseId: bal.warehouseId,
          quantity: Math.abs(qty),
          type: "RESTORE",
          direction: 1,
          userId,
          reason: "گەڕاندنەوەی بەرهەم",
          notes: `بەرهەم چالاککرایەوە · کۆگا ${qty}`,
          referenceType: "PRODUCT",
          referenceId: product.id,
          referenceNo: product.sku,
          allowZero: true,
          auditOnly: true,
        });
      }

      await tx.product.update({
        where: { id: product.id },
        data: { active: true },
      });
    });

    await notifySafe({
      companyId,
      userId,
      title: "بەرهەم گەڕێنرایەوە",
      message: `${product.name} (${product.sku}) چالاککرایەوە.`,
      category: "PRODUCT",
      priority: "NORMAL",
      href: `/dashboard/products/${product.id}`,
      entityType: "Product",
      entityId: product.id,
      metadata: { kind: "PRODUCT_RESTORE" },
    });

    await auditSafe({
      companyId,
      userId,
      module: "PRODUCT",
      action: "RESTORE",
      entityType: "Product",
      entityId: product.id,
      summary: `بەرهەم گەڕێنرایەوە: ${product.name}`,
      oldValue: { active: false },
      newValue: { active: true, name: product.name, sku: product.sku },
      req: _req,
    });

    return NextResponse.json({
      success: true,
      message: "بەرهەم گەڕێنرایەوە.",
    });
  } catch (error) {
    console.error("RESTORE PRODUCT ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
