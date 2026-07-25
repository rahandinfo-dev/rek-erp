import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { notifySafe } from "@/lib/notifications/create";
import { notifyStockLevels } from "@/lib/notifications/stock";
import { applyStockMovement } from "@/lib/inventory/movements";
import { auditSafe } from "@/lib/audit/log";

type Props = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: NextRequest, { params }: Props) {
  try {
    const user = await getCurrentUser();
    const companyId = user?.companyId;

    if (!companyId) {
      return NextResponse.json(
        { success: false, message: "تکایە سەرەتا بچۆ ژوورەوە." },
        { status: 401 }
      );
    }

    const { id } = await params;

    const purchase = await db.purchase.findFirst({
      where: { id, companyId },
      include: {
        supplier: true,
        warehouse: true,
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                purchasePrice: true,
                currentStock: true,
              },
            },
          },
        },
      },
    });

    if (!purchase) {
      return NextResponse.json(
        { success: false, message: "کڕین نەدۆزرایەوە." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: purchase });
  } catch (error) {
    console.error("GET PURCHASE ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: Props) {
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

    const purchase = await db.purchase.findFirst({
      where: { id, companyId },
      include: { items: true },
    });

    if (!purchase) {
      return NextResponse.json(
        { success: false, message: "کڕین نەدۆزرایەوە." },
        { status: 404 }
      );
    }

    if (purchase.status === "CANCELLED") {
      return NextResponse.json(
        { success: false, message: "ئەم کڕینە پێشتر هەڵوەشێنراوەتەوە." },
        { status: 400 }
      );
    }

    if (purchase.status === "COMPLETED") {
      for (const item of purchase.items) {
        const product = await db.product.findFirst({
          where: { id: item.productId, companyId },
        });

        if (!product) {
          return NextResponse.json(
            { success: false, message: "بەرهەم نەدۆزرایەوە." },
            { status: 400 }
          );
        }

        if (Number(product.currentStock) < Number(item.quantity)) {
          return NextResponse.json(
            {
              success: false,
              message: `ناتوانرێت کڕین هەڵبوەشێنرێتەوە چونکە کۆگای ${product.name} بەس نییە.`,
            },
            { status: 400 }
          );
        }
      }
    }

    await db.$transaction(async (tx) => {
      if (purchase.status === "COMPLETED") {
        for (const item of purchase.items) {
          await applyStockMovement(tx, {
            companyId,
            productId: item.productId,
            warehouseId: purchase.warehouseId,
            quantity: Number(item.quantity),
            type: "PURCHASE_RETURN",
            direction: -1,
            userId,
            reason: "هەڵوەشاندنەوەی کڕین",
            notes: `هەڵوەشاندنەوەی کڕین ${purchase.invoiceNo}`,
            referenceId: purchase.id,
            referenceType: "PURCHASE",
            referenceNo: purchase.invoiceNo,
            unitCost: Number(item.unitPrice),
          });
        }
      }

      await tx.purchase.update({
        where: { id },
        data: { status: "CANCELLED" },
      });
    });

    if (purchase.status === "COMPLETED") {
      await notifySafe({
        companyId,
        userId,
        title: "کڕین هەڵوەشێنرایەوە",
        message: `پسوولەی ${purchase.invoiceNo} هەڵوەشێنرایەوە.`,
        category: "PURCHASE",
        priority: "HIGH",
        href: `/dashboard/purchases/${purchase.id}`,
        entityType: "Purchase",
        entityId: purchase.id,
      });
      await notifyStockLevels(
        companyId,
        purchase.items.map((item) => item.productId)
      );
    }

    await auditSafe({
      companyId,
      userId,
      module: "PURCHASE",
      action: "DELETE",
      entityType: "Purchase",
      entityId: purchase.id,
      summary: `کڕین soft delete: ${purchase.invoiceNo}`,
      oldValue: { status: purchase.status, invoiceNo: purchase.invoiceNo },
      newValue: { status: "CANCELLED" },
      req: _req,
    });

    return NextResponse.json({
      success: true,
      message: "کڕین هەڵوەشێنرایەوە.",
    });
  } catch (error) {
    console.error("DELETE PURCHASE ERROR:", error);
    if (error instanceof Error && error.message === "INSUFFICIENT_STOCK") {
      return NextResponse.json(
        { success: false, message: "کۆگا بەس نییە بۆ هەڵوەشاندنەوە." },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
