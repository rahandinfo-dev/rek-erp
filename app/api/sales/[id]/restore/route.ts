import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { applyStockMovement } from "@/lib/inventory/movements";
import { auditSafe } from "@/lib/audit/log";
import { notifySafe } from "@/lib/notifications/create";

type Props = { params: Promise<{ id: string }> };

/**
 * Undo sale cancel — restore COMPLETED + reverse stock return.
 * Does not change cancel business logic; only adds recovery.
 */
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

    const sale = await db.sale.findFirst({
      where: { id, companyId },
      include: { items: true, invoice: { select: { id: true } } },
    });

    if (!sale) {
      return NextResponse.json(
        { success: false, message: "فرۆشتن نەدۆزرایەوە." },
        { status: 404 }
      );
    }

    if (sale.status !== "CANCELLED") {
      return NextResponse.json(
        { success: false, message: "ئەم فرۆشتنە هەڵنەوەشێنراوەتەوە." },
        { status: 400 }
      );
    }

    await db.$transaction(async (tx) => {
      for (const item of sale.items) {
        await applyStockMovement(tx, {
          companyId,
          productId: item.productId,
          warehouseId: sale.warehouseId,
          quantity: Number(item.quantity),
          type: "SALE",
          direction: -1,
          userId,
          reason: "گەڕاندنەوەی هەڵوەشاندنەوەی فرۆشتن",
          notes: `Undo cancel ${sale.invoiceNo}`,
          referenceId: sale.id,
          referenceType: "SALE",
          referenceNo: sale.invoiceNo,
          unitCost: Number(item.unitPrice),
        });
      }

      await tx.sale.update({
        where: { id },
        data: { status: "COMPLETED" },
      });

      if (sale.invoice) {
        await tx.invoice.update({
          where: { id: sale.invoice.id },
          data: { status: "ACTIVE" },
        });
      }
    });

    await auditSafe({
      companyId,
      userId,
      module: "SALE",
      action: "RESTORE",
      entityType: "Sale",
      entityId: sale.id,
      summary: `Sale undo cancel: ${sale.invoiceNo}`,
      req,
    });

    await notifySafe({
      companyId,
      userId,
      title: "فرۆشتن گەڕێنرایەوە",
      message: `پسوولەی ${sale.invoiceNo} گەڕێنرایەوە.`,
      category: "SALE",
      priority: "NORMAL",
      href: `/dashboard/sales/${sale.id}`,
      entityType: "Sale",
      entityId: sale.id,
    });

    return NextResponse.json({
      success: true,
      message: "فرۆشتن گەڕێنرایەوە.",
    });
  } catch (error) {
    console.error("RESTORE SALE ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
