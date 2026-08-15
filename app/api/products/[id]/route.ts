import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma/db";
import {
  normalizeProductPayload,
  productUpdateSchema,
} from "@/lib/validators/product";
import { getCurrentUser } from "@/lib/auth/current-user";
import { notifySafe } from "@/lib/notifications/create";
import { notifyStockLevels } from "@/lib/notifications/stock";
import {
  applyStockMovement,
  ensureProductWarehouseBalance,
} from "@/lib/inventory/movements";
import { auditSafe } from "@/lib/audit/log";
import { isCompanyAdministrator } from "@/lib/auth/authorization";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

async function getCompanyContext() {
  const user = await getCurrentUser();
  if (!user) return null;
  return { companyId: user.companyId, userId: user.id };
}

export async function GET(
  req: NextRequest,
  { params }: Params
) {
  try {
    const ctx = await getCompanyContext();

    if (!ctx) {
      return NextResponse.json(
        {
          success: false,
          message: "تکایە سەرەتا بچۆ ژوورەوە.",
        },
        {
          status: 401,
        }
      );
    }

    const { companyId } = ctx;

    const { id } = await params;

    const [product, mainWarehouse] = await Promise.all([
      db.product.findFirst({
        where: {
          id,
          companyId,
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          sku: true,
          barcode: true,
          image: true,
          notes: true,
          active: true,
          deletedAt: true,
          unitId: true,
          purchasePrice: true,
          costPrice: true,
          salePrice: true,
          profitMargin: true,
          currentStock: true,
          reservedStock: true,
          minimumStock: true,
          maximumStock: true,
          createdAt: true,
          updatedAt: true,
          unit: {
            select: { id: true, name: true, symbol: true, active: true },
          },
        },
      }),
      db.warehouse.findFirst({
        where: { companyId },
        orderBy: [{ isMain: "desc" }, { createdAt: "asc" }],
        select: { name: true },
      }),
    ]);

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          message: "بەرهەم نەدۆزرایەوە.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      success: true,
      data: product,
      warehouseName: mainWarehouse?.name || "کۆگا",
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "هەڵەیەک ڕوویدا.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: Params
) {
  try {
    const ctx = await getCompanyContext();

    if (!ctx) {
      return NextResponse.json(
        {
          success: false,
          message: "تکایە سەرەتا بچۆ ژوورەوە.",
        },
        {
          status: 401,
        }
      );
    }

    const { companyId, userId } = ctx;

    const { id } = await params;

    const body = await req.json();
    const parsed = productUpdateSchema.safeParse(body);

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

    const data = normalizeProductPayload(parsed.data);

      const [product, unit, duplicateSku, duplicateBarcode] = await Promise.all([
      db.product.findFirst({
        where: { id, companyId, deletedAt: null },
        select: {
          id: true,
          name: true,
          sku: true,
          barcode: true,
          salePrice: true,
          purchasePrice: true,
          currentStock: true,
          minimumStock: true,
          active: true,
        },
      }),
      db.unit.findFirst({
        where: { id: data.unitId, companyId },
        select: { id: true },
      }),
      db.product.findFirst({
        where: { companyId, sku: data.sku, NOT: { id } },
        select: { id: true },
      }),
      data.barcode
        ? db.product.findFirst({
            where: { companyId, barcode: data.barcode, NOT: { id } },
            select: { id: true },
          })
        : Promise.resolve(null),
    ]);

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          message: "بەرهەم نەدۆزرایەوە.",
        },
        {
          status: 404,
        }
      );
    }

    if (!unit) {
      return NextResponse.json(
        { success: false, message: "یەکە نادروستە." },
        { status: 400 }
      );
    }

    if (duplicateSku) {
      return NextResponse.json(
        { success: false, message: "ئەم SKU ـە پێشتر بەکارهاتووە." },
        { status: 400 }
      );
    }

    if (duplicateBarcode) {
      return NextResponse.json(
        {
          success: false,
          message: "ئەم Barcode ـە پێشتر تۆمارکراوە.",
        },
        { status: 400 }
      );
    }

    const updated = await db.$transaction(async (tx) => {
      const row = await tx.product.update({
        where: { id },
        data: {
          name: data.name,
          sku: data.sku,
          barcode: data.barcode ?? null,
          unitId: data.unitId,
          purchasePrice: data.purchasePrice,
          costPrice: data.costPrice,
          salePrice: data.salePrice,
          profitMargin: data.profitMargin,
          // Stock is synced via WarehouseStock + applyStockMovement below.
          reservedStock: data.reservedStock,
          minimumStock: data.minimumStock,
          maximumStock: data.maximumStock,
          notes: data.notes ?? null,
          active: data.active,
          image: data.image ?? null,
        },
        include: { unit: true },
      });

      const previousStock = Number(product.currentStock);
      const targetStock = Number(data.currentStock);
      const stockDelta = targetStock - previousStock;

      if (Math.abs(stockDelta) >= 0.00001) {
        await ensureProductWarehouseBalance(tx, companyId, id);
        const mainWh =
          (await tx.warehouse.findFirst({
            where: { companyId, isMain: true, active: true },
            select: { id: true },
          })) ||
          (await tx.warehouse.findFirst({
            where: { companyId, active: true },
            select: { id: true },
            orderBy: { createdAt: "asc" },
          }));

        if (!mainWh) {
          throw new Error("NO_WAREHOUSE");
        }

        await applyStockMovement(tx, {
          companyId,
          productId: id,
          warehouseId: mainWh.id,
          quantity: Math.abs(stockDelta),
          type: "ADJUSTMENT",
          direction: stockDelta > 0 ? 1 : -1,
          userId,
          reason: "نوێکردنەوەی بەرهەم",
          notes: `ڕێکخستنی کۆگا لە فۆرمی بەرهەم: ${previousStock} → ${targetStock}`,
          referenceType: "PRODUCT_UPDATE",
          referenceId: id,
          allowNegative: false,
        });
      }

      const synced = await tx.product.findFirst({
        where: { id, companyId },
        include: { unit: true },
      });
      return synced ?? row;
    });

    const { invalidateAfterProduct } = await import("@/lib/cache/invalidate");
    invalidateAfterProduct(companyId);

    const stockChanged =
      Number(product.currentStock) !== Number(updated.currentStock) ||
      Number(product.minimumStock) !== Number(updated.minimumStock);

    await notifySafe({
      companyId,
      title: "بەرهەم نوێکرایەوە",
      message: `${updated.name} (${updated.sku}) نوێکرایەوە.`,
      category: "PRODUCT",
      priority: "NORMAL",
      href: `/dashboard/products/${updated.id}`,
      entityType: "Product",
      entityId: updated.id,
    });

    if (stockChanged) {
      await notifySafe({
        companyId,
        title: "ئینڤێنتۆری نوێکرایەوە",
        message: `کۆگای ${updated.name} بوو بە ${Number(updated.currentStock)}.`,
        category: "INVENTORY",
        priority: "NORMAL",
        href: "/dashboard/inventory",
        entityType: "Product",
        entityId: updated.id,
      });
      await notifyStockLevels(companyId, [updated.id]);
    }

    await auditSafe({
      companyId,
      userId,
      module: "PRODUCT",
      action: "UPDATE",
      entityType: "Product",
      entityId: updated.id,
      summary: `بەرهەم نوێکرایەوە: ${updated.name}`,
      oldValue: {
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        salePrice: Number(product.salePrice),
        purchasePrice: Number(product.purchasePrice),
        currentStock: Number(product.currentStock),
        active: product.active,
      },
      newValue: {
        name: updated.name,
        sku: updated.sku,
        barcode: updated.barcode,
        salePrice: Number(updated.salePrice),
        purchasePrice: Number(updated.purchasePrice),
        currentStock: Number(updated.currentStock),
        active: updated.active,
      },
      req,
    });

    return NextResponse.json({
      success: true,
      message: "بەرهەم بە سەرکەوتوویی نوێکرایەوە.",
      data: updated,
    });
  } catch (error) {
    console.error(error);

    if (error instanceof Error && error.message === "INSUFFICIENT_STOCK") {
      return NextResponse.json(
        {
          success: false,
          message: "کۆگا بەس نییە بۆ ئەم گۆڕانکارییە. لە ئینڤێنتۆری ڕێکی بکەرەوە.",
        },
        { status: 400 }
      );
    }
    if (error instanceof Error && error.message === "NO_WAREHOUSE") {
      return NextResponse.json(
        { success: false, message: "هیچ کۆگایەک نەدۆزرایەوە." },
        { status: 400 }
      );
    }

    const message =
      error &&
      typeof error === "object" &&
      "errors" in error &&
      Array.isArray((error as { errors?: { message?: string }[] }).errors)
        ? (error as { errors: { message?: string }[] }).errors[0]?.message
        : undefined;

    return NextResponse.json(
      {
        success: false,
        message: message ?? "هەڵەیەک ڕوویدا.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: Params
) {
  try {
    const ctx = await getCompanyContext();

    if (!ctx) {
      return NextResponse.json(
        {
          success: false,
          message: "تکایە سەرەتا بچۆ ژوورەوە.",
        },
        {
          status: 401,
        }
      );
    }

    const { companyId, userId } = ctx;
    const { id } = await params;
    const purge = _req.nextUrl.searchParams.get("purge") === "1";

    const product = await db.product.findFirst({
      where: { id, companyId, deletedAt: purge ? { not: null } : null },
      select: {
        id: true,
        name: true,
        sku: true,
        active: true,
        deletedAt: true,
        currentStock: true,
        _count: {
          select: {
            saleItems: true,
            purchaseItems: true,
            inventoryTransactions: true,
            warehouseStocks: true,
            stockTransferItems: true,
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          message: "بەرهەم نەدۆزرایەوە.",
        },
        {
          status: 404,
        }
      );
    }

    if (purge) {
      if (!(await isCompanyAdministrator(companyId, userId))) {
        return NextResponse.json(
          { success: false, message: "تەنها بەڕێوەبەری کۆمپانیا دەتوانێت بە هەمیشەیی بسڕێتەوە." },
          { status: 403 }
        );
      }
      if (!product.deletedAt) {
        return NextResponse.json(
          {
            success: false,
            message: "سەرەتا soft delete بکە، دواتر permanent delete.",
          },
          { status: 400 }
        );
      }
      if (
        product._count.saleItems > 0 ||
        product._count.purchaseItems > 0 ||
        product._count.inventoryTransactions > 0 ||
        product._count.warehouseStocks > 0 ||
        product._count.stockTransferItems > 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "ناتوانرێت permanently بسڕدرێتەوە — مێژووی فرۆشتن/کڕین/جوڵە هەیە.",
          },
          { status: 400 }
        );
      }
      await db.product.delete({ where: { id } });
      await auditSafe({
        companyId,
        userId,
        module: "PRODUCT",
        action: "DELETE",
        entityType: "Product",
        entityId: product.id,
        summary: `بەرهەم permanent delete: ${product.name}`,
        oldValue: { name: product.name, sku: product.sku },
        metadata: { permanent: true },
        req: _req,
      });
      return NextResponse.json({
        success: true,
        message: "بەرهەم بە هەمیشەیی سڕایەوە.",
        permanent: true,
      });
    }

    if (product.deletedAt) {
      return NextResponse.json(
        {
          success: false,
          message: "ئەم بەرهەمە پێشتر سڕاوەتەوە.",
        },
        { status: 400 }
      );
    }

    // Soft-delete only — InventoryTransaction history is never deleted.
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
          type: "PRODUCT_DELETE",
          direction: -1,
          userId,
          reason: "سڕینەوەی بەرهەم",
          notes: `بەرهەم ناچالاککرا · کۆگا پارێزراو (${qty})`,
          referenceType: "PRODUCT",
          referenceId: product.id,
          referenceNo: product.sku,
          allowZero: true,
          auditOnly: true,
        });
      }

      await tx.product.update({
        where: { id: product.id },
        data: { active: false, deletedAt: new Date(), deletedById: userId },
      });
    });

    await notifySafe({
      companyId,
      userId,
      title: "بەرهەم سڕایەوە",
      message: `${product.name} (${product.sku}) ناچالاککرا — مێژووی جوڵە پارێزراوە.`,
      category: "PRODUCT",
      priority: "HIGH",
      href: `/dashboard/products/${product.id}`,
      entityType: "Product",
      entityId: product.id,
      metadata: { kind: "PRODUCT_DELETE" },
    });

    await auditSafe({
      companyId,
      userId,
      module: "PRODUCT",
      action: "DELETE",
      entityType: "Product",
      entityId: product.id,
      summary: `بەرهەم soft delete: ${product.name}`,
      oldValue: {
        id: product.id,
        name: product.name,
        sku: product.sku,
        active: true,
        currentStock: Number(product.currentStock),
      },
      newValue: { active: false },
      req: _req,
    });

    return NextResponse.json({
      success: true,
      message: "بەرهەم soft delete کرا — Undo بەردەستە · مێژوو هەمیشەیی دەمێنێتەوە.",
      soft: true,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "هەڵەیەک ڕوویدا.",
      },
      {
        status: 500,
      }
    );
  }
}
