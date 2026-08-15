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

    const sale = await db.sale.findFirst({
      where: { id, companyId, deletedAt: null },
      include: {
        customer: true,
        warehouse: true,
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                salePrice: true,
                currentStock: true,
              },
            },
          },
        },
      },
    });

    if (!sale) {
      return NextResponse.json(
        { success: false, message: "فرۆشتن نەدۆزرایەوە." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: sale });
  } catch (error) {
    console.error("GET SALE ERROR:", error);
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

    if (sale.status === "CANCELLED") {
      return NextResponse.json(
        { success: false, message: "ئەم فرۆشتنە پێشتر هەڵوەشێنراوەتەوە." },
        { status: 400 }
      );
    }

    await db.$transaction(async (tx) => {
      if (sale.status === "COMPLETED") {
        for (const item of sale.items) {
          await applyStockMovement(tx, {
            companyId,
            productId: item.productId,
            warehouseId: sale.warehouseId,
            quantity: Number(item.quantity),
            type: "SALE_RETURN",
            direction: 1,
            userId,
            reason: "هەڵوەشاندنەوەی فرۆشتن",
            notes: `هەڵوەشاندنەوەی فرۆشتن ${sale.invoiceNo}`,
            referenceId: sale.id,
            referenceType: "SALE",
            referenceNo: sale.invoiceNo,
            unitCost: Number(item.unitPrice),
          });
        }
      }

      await tx.sale.update({
        where: { id },
        data: { status: "CANCELLED", deletedAt: new Date(), deletedById: userId },
      });

      if (sale.invoice) {
        await tx.invoice.update({
          where: { id: sale.invoice.id },
          data: { status: "VOID" },
        });
      }
    });

    await notifySafe({
      companyId,
      userId,
      title: "فرۆشتن هەڵوەشێنرایەوە",
      message: `پسوولەی ${sale.invoiceNo} هەڵوەشێنرایەوە.`,
      category: "SALE",
      priority: "HIGH",
      href: sale.invoice
        ? `/dashboard/invoices/${sale.invoice.id}`
        : `/dashboard/sales/${sale.id}`,
      entityType: "Sale",
      entityId: sale.id,
    });

    if (sale.status === "COMPLETED") {
      await notifySafe({
        companyId,
        title: "ئینڤێنتۆری نوێکرایەوە",
        message: `کۆگا دوای هەڵوەشاندنەوەی ${sale.invoiceNo} نوێکرایەوە.`,
        category: "INVENTORY",
        priority: "NORMAL",
        href: "/dashboard/inventory/history",
        entityType: "Sale",
        entityId: sale.id,
      });
      await notifyStockLevels(
        companyId,
        sale.items.map((item) => item.productId)
      );
    }

    await auditSafe({
      companyId,
      userId,
      module: "SALE",
      action: "DELETE",
      entityType: "Sale",
      entityId: sale.id,
      summary: `فرۆشتن soft delete: ${sale.invoiceNo}`,
      oldValue: { status: sale.status, invoiceNo: sale.invoiceNo },
      newValue: { status: "CANCELLED" },
      req: _req,
    });

    return NextResponse.json({
      success: true,
      message: "فرۆشتن هەڵوەشێنرایەوە.",
    });
  } catch (error) {
    console.error("DELETE SALE ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
