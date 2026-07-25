import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { applyStockMovement } from "@/lib/inventory/movements";
import { auditSafe } from "@/lib/audit/log";
import { notifySafe } from "@/lib/notifications/create";

type Props = { params: Promise<{ id: string }> };

/** Undo purchase cancel — restore COMPLETED + re-apply stock in. */
export async function POST(req: NextRequest, { params }: Props) {
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

    if (purchase.status !== "CANCELLED") {
      return NextResponse.json(
        { success: false, message: "ئەم کڕینە هەڵنەوەشێنراوەتەوە." },
        { status: 400 }
      );
    }

    await db.$transaction(async (tx) => {
      for (const item of purchase.items) {
        await applyStockMovement(tx, {
          companyId,
          productId: item.productId,
          warehouseId: purchase.warehouseId,
          quantity: Number(item.quantity),
          type: "PURCHASE",
          direction: 1,
          userId,
          reason: "گەڕاندنەوەی هەڵوەشاندنەوەی کڕین",
          notes: `Undo cancel ${purchase.invoiceNo}`,
          referenceId: purchase.id,
          referenceType: "PURCHASE",
          referenceNo: purchase.invoiceNo,
          unitCost: Number(item.unitPrice),
        });
      }

      await tx.purchase.update({
        where: { id },
        data: { status: "COMPLETED" },
      });
    });

    await auditSafe({
      companyId,
      userId,
      module: "PURCHASE",
      action: "RESTORE",
      entityType: "Purchase",
      entityId: purchase.id,
      summary: `Purchase undo cancel: ${purchase.invoiceNo}`,
      req,
    });

    await notifySafe({
      companyId,
      userId,
      title: "کڕین گەڕێنرایەوە",
      message: `پسوولەی ${purchase.invoiceNo} گەڕێنرایەوە.`,
      category: "PURCHASE",
      priority: "NORMAL",
      href: `/dashboard/purchases/${purchase.id}`,
      entityType: "Purchase",
      entityId: purchase.id,
    });

    return NextResponse.json({
      success: true,
      message: "کڕین گەڕێنرایەوە.",
    });
  } catch (error) {
    console.error("RESTORE PURCHASE ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
