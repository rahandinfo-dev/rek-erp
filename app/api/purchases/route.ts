import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma/db";
import { getCurrentCompanyId, getCurrentUser } from "@/lib/auth/current-user";
import { createPurchaseSchema } from "@/lib/validators/purchase";
import { formatMoney, roundMoney } from "@/lib/utils/format";
import { notifySafe } from "@/lib/notifications/create";
import { notifyStockLevels } from "@/lib/notifications/stock";
import { applyStockMovement } from "@/lib/inventory/movements";
import { ensureWalkInSupplier } from "@/lib/parties/walk-in";
import { auditSafe } from "@/lib/audit/log";
import { invalidateAfterPurchase } from "@/lib/cache/invalidate";

export async function GET() {
  try {
    const companyId = await getCurrentCompanyId();

    if (!companyId) {
      return NextResponse.json(
        { success: false, message: "تکایە سەرەتا بچۆ ژوورەوە." },
        { status: 401 }
      );
    }

    const purchases = await db.purchase.findMany({
      where: { companyId },
      select: {
        id: true,
        invoiceNo: true,
        total: true,
        createdAt: true,
        supplier: { select: { id: true, name: true, code: true } },
        warehouse: { select: { id: true, name: true, code: true } },
        items: {
          select: {
            id: true,
            quantity: true,
            unitPrice: true,
            product: { select: { id: true, name: true, sku: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 250,
    });

    return NextResponse.json({ success: true, data: purchases });
  } catch (error) {
    console.error("GET PURCHASES ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const companyId = user?.companyId;

    if (!user || !companyId) {
      return NextResponse.json(
        { success: false, message: "تکایە سەرەتا بچۆ ژوورەوە." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validation = createPurchaseSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, errors: validation.error.flatten() },
        { status: 400 }
      );
    }

    const data = validation.data;

    const resolvedSupplierId =
      data.supplierId ||
      (await ensureWalkInSupplier(companyId)).id;

    const [supplier, warehouse] = await Promise.all([
      db.supplier.findFirst({
        where: { id: resolvedSupplierId, companyId, active: true },
      }),
      db.warehouse.findFirst({
        where: { id: data.warehouseId, companyId },
      }),
    ]);

    if (!supplier) {
      return NextResponse.json(
        { success: false, message: "دابینکەر نەدۆزرایەوە." },
        { status: 400 }
      );
    }

    if (!warehouse) {
      return NextResponse.json(
        { success: false, message: "کۆگا نەدۆزرایەوە." },
        { status: 400 }
      );
    }

    const productIds = data.items.map((item) => item.productId);
    const products = await db.product.findMany({
      where: {
        companyId,
        id: { in: productIds },
        active: true,
      },
    });

    if (products.length !== new Set(productIds).size) {
      return NextResponse.json(
        { success: false, message: "هەندێک بەرهەم نادروستن یان ناچالاکن." },
        { status: 400 }
      );
    }

    const subtotal = roundMoney(
      data.items.reduce((sum, item) => sum + item.total, 0)
    );
    const total = roundMoney(subtotal - data.discount + data.tax);

    const wh = await db.warehouse.findFirst({
      where: { id: data.warehouseId, companyId },
      select: { code: true },
    });
    const { generatePurchaseNumber } = await import("@/lib/numbering/engine");
    const allocated = await generatePurchaseNumber(
      companyId,
      wh?.code,
      null
    );
    const invoiceNo = allocated.value;

    const purchase = await db.$transaction(async (tx) => {
      const created = await tx.purchase.create({
        data: {
          invoiceNo,
          supplierId: resolvedSupplierId,
          warehouseId: data.warehouseId,
          companyId,
          purchaseDate: data.purchaseDate,
          status: "COMPLETED",
          subtotal,
          discount: data.discount,
          tax: data.tax,
          total,
          notes: data.notes || null,
          items: {
            create: data.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.total,
              currency: item.currency || "IQD",
            })),
          },
        },
        include: {
          supplier: true,
          warehouse: true,
          items: { include: { product: true } },
        },
      });

      for (const item of data.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            purchasePrice: item.unitPrice,
            costPrice: item.unitPrice,
          },
        });

        await applyStockMovement(tx, {
          companyId,
          productId: item.productId,
          warehouseId: data.warehouseId,
          quantity: item.quantity,
          type: "PURCHASE",
          direction: 1,
          userId: user.id,
          reason: "کڕین",
          notes: `کڕین ${invoiceNo}`,
          referenceId: created.id,
          referenceType: "PURCHASE",
          referenceNo: invoiceNo,
          unitCost: item.unitPrice,
        });
      }

      return created;
    });

    await notifySafe({
      companyId,
      title: "کڕین تەواوکرا",
      message: `پسوولەی ${purchase.invoiceNo} تۆمارکرا.`,
      category: "PURCHASE",
      priority: "NORMAL",
      href: `/dashboard/purchases/${purchase.id}`,
      entityType: "Purchase",
      entityId: purchase.id,
    });

    await notifySafe({
      companyId,
      title: "ئینڤێنتۆری نوێکرایەوە",
      message: `کۆگا دوای کڕینی ${purchase.invoiceNo} نوێکرایەوە.`,
      category: "INVENTORY",
      priority: "NORMAL",
      href: "/dashboard/inventory",
      entityType: "Purchase",
      entityId: purchase.id,
    });

    if (total >= 1_000_000) {
      await notifySafe({
        companyId,
        userId: user.id,
        title: "کڕینی گەورە",
        message: `کڕینی ${purchase.invoiceNo} بە بڕی ${formatMoney(total)} تۆمارکرا.`,
        category: "PURCHASE",
        priority: "HIGH",
        href: `/dashboard/purchases/${purchase.id}`,
        entityType: "Purchase",
        entityId: purchase.id,
        metadata: { kind: "LARGE_PURCHASE", total },
      });
    }

    await notifyStockLevels(
      companyId,
      data.items.map((item) => item.productId)
    );

    await auditSafe({
      companyId,
      userId: user.id,
      module: "PURCHASE",
      action: "CREATE",
      entityType: "Purchase",
      entityId: purchase.id,
      summary: `کڕینی ${purchase.invoiceNo} دروستکرا`,
      newValue: { invoiceNo: purchase.invoiceNo, total },
      req,
    });

    invalidateAfterPurchase(companyId);

    return NextResponse.json({
      success: true,
      data: purchase,
      message: "کڕین بە سەرکەوتوویی تۆمارکرا.",
    });
  } catch (error) {
    console.error("CREATE PURCHASE ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
