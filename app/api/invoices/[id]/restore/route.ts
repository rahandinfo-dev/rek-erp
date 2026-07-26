import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { applyStockMovement } from "@/lib/inventory/movements";
import { auditSafe } from "@/lib/audit/log";

type Props = { params: Promise<{ id: string }> };

/** Undo invoice void — restore ACTIVE invoice + COMPLETED sale + stock. */
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

    const invoice = await db.invoice.findFirst({
      where: { id, companyId },
      include: { sale: { include: { items: true } } },
    });

    if (!invoice) {
      return NextResponse.json(
        { success: false, message: "پسوولە نەدۆزرایەوە." },
        { status: 404 }
      );
    }

    if (invoice.status !== "VOID") {
      return NextResponse.json(
        { success: false, message: "ئەم پسوولەیە VOID نییە." },
        { status: 400 }
      );
    }

    const sale = invoice.sale;

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
          reason: "گەڕاندنەوەی هەڵوەشاندنەوەی پسوولە",
          notes: `Undo void ${invoice.invoiceNo}`,
          referenceId: sale.id,
          referenceType: "SALE",
          referenceNo: sale.invoiceNo,
          unitCost: Number(item.unitPrice),
        });
      }

      await tx.sale.update({
        where: { id: sale.id },
        data: { status: "COMPLETED" },
      });

      await tx.invoice.update({
        where: { id: invoice.id },
        data: { status: "ACTIVE" },
      });
    });

    await auditSafe({
      companyId,
      userId,
      module: "INVOICE",
      action: "RESTORE",
      entityType: "پسوولە",
      entityId: invoice.id,
      summary: `Invoice undo void: ${invoice.invoiceNo}`,
      req,
    });

    return NextResponse.json({
      success: true,
      message: "پسوولە گەڕێنرایەوە.",
    });
  } catch (error) {
    console.error("RESTORE INVOICE ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
