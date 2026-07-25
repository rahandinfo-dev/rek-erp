import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { stockTransferSchema } from "@/lib/validators/inventory";
import {
  applyStockMovement,
  ensureCompanyWarehouseBalances,
} from "@/lib/inventory/movements";
import { notifySafe } from "@/lib/notifications/create";
import { notifyStockLevels } from "@/lib/notifications/stock";
import { auditSafe } from "@/lib/audit/log";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "تکایە سەرەتا بچۆ ژوورەوە." },
        { status: 401 }
      );
    }

    const transfers = await db.stockTransfer.findMany({
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
    });

    return NextResponse.json({
      success: true,
      data: transfers.map((t) => ({
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
      })),
    });
  } catch (error) {
    console.error("GET TRANSFERS ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "تکایە سەرەتا بچۆ ژوورەوە." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = stockTransferSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: parsed.error.issues[0]?.message || "زانیاری نادروستە.",
          errors: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const companyId = user.companyId;
    const referenceNo = `TRF-${Date.now()}`;

    const [fromWh, toWh, products] = await Promise.all([
      db.warehouse.findFirst({
        where: { id: data.fromWarehouseId, companyId },
      }),
      db.warehouse.findFirst({
        where: { id: data.toWarehouseId, companyId },
      }),
      db.product.findMany({
        where: {
          companyId,
          id: { in: data.items.map((i) => i.productId) },
          active: true,
        },
        select: { id: true, name: true },
      }),
    ]);

    if (!fromWh || !toWh) {
      return NextResponse.json(
        { success: false, message: "کۆگا نەدۆزرایەوە." },
        { status: 404 }
      );
    }

    if (products.length !== new Set(data.items.map((i) => i.productId)).size) {
      return NextResponse.json(
        { success: false, message: "هەندێک بەرهەم نادروستن." },
        { status: 400 }
      );
    }

    let transfer;
    try {
      transfer = await db.$transaction(async (tx) => {
        await ensureCompanyWarehouseBalances(tx, companyId);

        const created = await tx.stockTransfer.create({
          data: {
            companyId,
            referenceNo,
            fromWarehouseId: data.fromWarehouseId,
            toWarehouseId: data.toWarehouseId,
            userId: user.id,
            reason: data.reason,
            notes: data.notes || null,
            items: {
              create: data.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
              })),
            },
          },
          include: {
            fromWarehouse: { select: { name: true } },
            toWarehouse: { select: { name: true } },
            items: true,
          },
        });

        for (const item of data.items) {
          await applyStockMovement(tx, {
            companyId,
            productId: item.productId,
            warehouseId: data.fromWarehouseId,
            quantity: item.quantity,
            type: "TRANSFER_OUT",
            direction: -1,
            userId: user.id,
            reason: data.reason,
            notes: data.notes || `گواستنەوە بۆ ${toWh.name}`,
            referenceId: created.id,
            referenceType: "TRANSFER",
            referenceNo,
            relatedWarehouseId: data.toWarehouseId,
          });

          await applyStockMovement(tx, {
            companyId,
            productId: item.productId,
            warehouseId: data.toWarehouseId,
            quantity: item.quantity,
            type: "TRANSFER_IN",
            direction: 1,
            userId: user.id,
            reason: data.reason,
            notes: data.notes || `گواستنەوە لە ${fromWh.name}`,
            referenceId: created.id,
            referenceType: "TRANSFER",
            referenceNo,
            relatedWarehouseId: data.fromWarehouseId,
          });
        }

        return created;
      });
    } catch (error) {
      if (error instanceof Error && error.message === "INSUFFICIENT_STOCK") {
        return NextResponse.json(
          {
            success: false,
            message: "کۆگای سەرچاوە بەس نییە بۆ گواستنەوە.",
          },
          { status: 400 }
        );
      }
      throw error;
    }

    await notifySafe({
      companyId,
      userId: user.id,
      title: "گواستنەوەی کۆگا",
      message: `${referenceNo}: ${fromWh.name} → ${toWh.name} (${data.items.length} بەرهەم)`,
      category: "WAREHOUSE",
      priority: "HIGH",
      href: "/dashboard/inventory/transfers",
      entityType: "StockTransfer",
      entityId: transfer.id,
      metadata: { kind: "WAREHOUSE_TRANSFER", referenceNo },
    });

    await notifyStockLevels(
      companyId,
      data.items.map((i) => i.productId)
    );

    await auditSafe({
      companyId,
      userId: user.id,
      module: "INVENTORY",
      action: "TRANSFER",
      entityType: "StockTransfer",
      entityId: transfer.id,
      summary: `گواستنەوە ${referenceNo}: ${fromWh.name} → ${toWh.name}`,
      newValue: { referenceNo, itemCount: data.items.length },
      req,
    });

    return NextResponse.json({
      success: true,
      data: transfer,
      message: "گواستنەوە تۆمارکرا.",
    });
  } catch (error) {
    console.error("CREATE TRANSFER ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
