import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  stockAdjustmentLegacySchema,
  stockAdjustmentSchema,
} from "@/lib/validators/inventory";
import {
  applyStockMovement,
  ensureProductWarehouseBalance,
} from "@/lib/inventory/movements";
import { notifySafe } from "@/lib/notifications/create";
import { notifyStockLevels } from "@/lib/notifications/stock";
import { auditSafe } from "@/lib/audit/log";

const MODE_LABELS = {
  increase: "زیادکردنی کۆگا",
  decrease: "کەمکردنی کۆگا",
  correct: "ڕاستکردنەوەی دەستی",
} as const;

function num(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function parseAdjustmentBody(body: unknown) {
  const modern = stockAdjustmentSchema.safeParse(body);
  if (modern.success) return { ok: true as const, data: modern.data };

  const legacy = stockAdjustmentLegacySchema.safeParse(body);
  if (legacy.success) {
    return {
      ok: true as const,
      data: {
        productId: legacy.data.productId,
        warehouseId: legacy.data.warehouseId,
        mode: legacy.data.direction as "increase" | "decrease",
        quantity: legacy.data.quantity,
        reason: legacy.data.reason,
        notes: legacy.data.notes,
      },
    };
  }

  return {
    ok: false as const,
    errors: modern.success ? legacy.error.flatten() : modern.error.flatten(),
  };
}

/** Permanent adjustment ledger — GET only lists; never deletes. */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "تکایە سەرەتا بچۆ ژوورەوە." },
        { status: 401 }
      );
    }

    const { searchParams } = req.nextUrl;
    const productId = searchParams.get("productId");
    const warehouseId = searchParams.get("warehouseId");

    // Live warehouse balance preview for the form.
    if (productId && warehouseId && searchParams.get("balance") === "1") {
      const balance = await db.warehouseStock.findUnique({
        where: {
          productId_warehouseId: { productId, warehouseId },
        },
        select: { quantity: true, reserved: true },
      });
      return NextResponse.json({
        success: true,
        data: {
          quantity: balance ? num(balance.quantity) : 0,
          reserved: balance ? num(balance.reserved) : 0,
        },
      });
    }

    const rows = await db.inventoryTransaction.findMany({
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
    });

    return NextResponse.json({
      success: true,
      data: rows.map((r) => {
        const previousQty = num(r.previousQty);
        const newQty = num(r.newQty);
        return {
          ...r,
          previousQty,
          newQty,
          quantity: num(r.quantity),
          delta: Math.round((newQty - previousQty) * 100) / 100,
          date: r.createdAt.toISOString(),
        };
      }),
    });
  } catch (error) {
    console.error("GET ADJUSTMENTS ERROR:", error);
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
    const parsed = parseAdjustmentBody(body);
    if (!parsed.ok) {
      return NextResponse.json(
        {
          success: false,
          message: "زانیاری نادروستە. هۆکار پێویستە.",
          errors: parsed.errors,
        },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const companyId = user.companyId;
    const referenceNo = `ADJ-${Date.now()}`;

    const [product, warehouse] = await Promise.all([
      db.product.findFirst({
        where: { id: data.productId, companyId, active: true },
        select: { id: true, name: true, sku: true },
      }),
      db.warehouse.findFirst({
        where: { id: data.warehouseId, companyId },
        select: { id: true, name: true },
      }),
    ]);

    if (!product) {
      return NextResponse.json(
        { success: false, message: "بەرهەم نەدۆزرایەوە." },
        { status: 404 }
      );
    }
    if (!warehouse) {
      return NextResponse.json(
        { success: false, message: "کۆگا نەدۆزرایەوە." },
        { status: 404 }
      );
    }

    let result;
    try {
      result = await db.$transaction(async (tx) => {
        await ensureProductWarehouseBalance(tx, companyId, data.productId);

        const balance = await tx.warehouseStock.findUnique({
          where: {
            productId_warehouseId: {
              productId: data.productId,
              warehouseId: data.warehouseId,
            },
          },
          select: { quantity: true },
        });
        const currentQty = balance ? num(balance.quantity) : 0;

        let direction: 1 | -1 = 1;
        let moveQty = data.quantity;
        let modeNote: string = MODE_LABELS[data.mode];

        if (data.mode === "increase") {
          direction = 1;
          moveQty = data.quantity;
        } else if (data.mode === "decrease") {
          direction = -1;
          moveQty = data.quantity;
        } else {
          // Manual correction: set absolute quantity.
          const target = data.quantity;
          const delta = target - currentQty;
          if (Math.abs(delta) < 0.00001) {
            throw new Error("NO_CHANGE");
          }
          direction = delta > 0 ? 1 : -1;
          moveQty = Math.abs(delta);
          modeNote = `${MODE_LABELS.correct} → ${target}`;
        }

        const movement = await applyStockMovement(tx, {
          companyId,
          productId: data.productId,
          warehouseId: data.warehouseId,
          quantity: moveQty,
          type: "ADJUSTMENT",
          direction,
          userId: user.id,
          reason: data.reason,
          notes: [modeNote, data.notes].filter(Boolean).join(" · ") || null,
          referenceType: "ADJUSTMENT",
          referenceNo,
        });

        return { ...movement, mode: data.mode, moveQty, direction };
      });
    } catch (error) {
      if (error instanceof Error && error.message === "INSUFFICIENT_STOCK") {
        return NextResponse.json(
          { success: false, message: "کۆگا بەس نییە بۆ کەمکردنەوە." },
          { status: 400 }
        );
      }
      if (error instanceof Error && error.message === "NO_CHANGE") {
        return NextResponse.json(
          {
            success: false,
            message: "بڕی نوێ هەمان بڕی ئێستایە — گۆڕانکاری نییە.",
          },
          { status: 400 }
        );
      }
      throw error;
    }

    await notifySafe({
      companyId,
      userId: user.id,
      title: MODE_LABELS[data.mode],
      message: `${product.name}: ${result.previousQty} → ${result.newQty} (${warehouse.name}) · ${data.reason}`,
      category: "INVENTORY",
      priority: "HIGH",
      href: `/dashboard/inventory/adjustments`,
      entityType: "Product",
      entityId: product.id,
      metadata: {
        kind: "INVENTORY_ADJUSTMENT",
        mode: data.mode,
        referenceNo,
        previousQty: result.previousQty,
        newQty: result.newQty,
        reason: data.reason,
      },
    });

    await notifyStockLevels(companyId, [product.id]);

    await auditSafe({
      companyId,
      userId: user.id,
      module: "INVENTORY",
      action: "ADJUST",
      entityType: "Product",
      entityId: product.id,
      summary: `${MODE_LABELS[data.mode]} · ${product.name}`,
      newValue: {
        mode: data.mode,
        referenceNo,
        previousQty: result.previousQty,
        newQty: result.newQty,
      },
      req,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        referenceNo,
        mode: data.mode,
      },
      message: `${MODE_LABELS[data.mode]} تۆمارکرا.`,
    });
  } catch (error) {
    console.error("CREATE ADJUSTMENT ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
