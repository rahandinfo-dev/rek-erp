import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma/db";
import { getCurrentCompanyId, getCurrentUser } from "@/lib/auth/current-user";
import {
  normalizeProductPayload,
  productCreateSchema,
} from "@/lib/validators/product";
import { notifySafe } from "@/lib/notifications/create";
import { notifyStockLevels } from "@/lib/notifications/stock";
import {
  generateProductBarcode,
  sanitizeCode128,
} from "@/lib/barcode/code128";
import { applyStockMovement } from "@/lib/inventory/movements";
import { listProductsPage } from "@/lib/products/list";
import { auditSafe } from "@/lib/audit/log";
import { invalidateAfterProduct } from "@/lib/cache/invalidate";
import { listProductSelectorOptions } from "@/lib/products/selector-query";

export async function GET(req: NextRequest) {
  try {
    const companyId = await getCurrentCompanyId();

    if (!companyId) {
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

    const { searchParams } = req.nextUrl;
    const usePagination =
      searchParams.has("page") ||
      searchParams.has("pageSize") ||
      searchParams.has("q") ||
      searchParams.has("active");

    // Compact picker payload for Sales / Purchases forms.
    if (!usePagination) {
      if (process.env.PRODUCT_SELECTOR_DEBUG === "true") {
        console.info("[PRODUCT_SELECTOR_DEBUG] STEP 1 API request", {
          route: "/api/products",
          companyId,
        });
      }
      const products = await listProductSelectorOptions(companyId);

      if (process.env.PRODUCT_SELECTOR_DEBUG === "true") {
        console.info("[PRODUCT_SELECTOR_DEBUG] STEP 4 API response count", products.length);
      }

      return NextResponse.json(
        {
          success: true,
          data: products,
          ...(process.env.PRODUCT_SELECTOR_DEBUG === "true"
            ? { productSelectorDebug: true }
            : {}),
        },
        {
          headers: {
            "Cache-Control": "private, no-store",
          },
        }
      );
    }

    const q = (searchParams.get("q") || "").trim();
    const page = Math.max(1, Number(searchParams.get("page") || 1) || 1);
    const pageSize = Math.min(
      48,
      Math.max(1, Number(searchParams.get("pageSize") || 12) || 12)
    );
    const activeParam = searchParams.get("active");

    const result = await listProductsPage({
      companyId,
      q,
      page,
      pageSize,
      active:
        activeParam === "true" || activeParam === "false" ? activeParam : null,
    });

    return NextResponse.json({
      success: true,
      data: result.products,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("GET PRODUCTS ERROR:", error);

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

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const companyId = user?.companyId;

    if (!user || !companyId) {
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

    const body = await req.json();

    const validation = productCreateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message:
            validation.error.issues[0]?.message || "زانیاری نادروستە.",
          errors: validation.error.flatten(),
        },
        {
          status: 400,
        }
      );
    }

    const data = normalizeProductPayload(validation.data);

    const {
      generateProductSku,
      generateProductBarcodeNumber,
    } = await import("@/lib/numbering/engine");

    let sku = data.sku.trim();
    if (!sku) {
      sku = (await generateProductSku(companyId)).value;
    } else {
      // Manual override — validate uniqueness
      const taken = await db.product.findFirst({
        where: { companyId, sku },
        select: { id: true },
      });
      if (taken) {
        return NextResponse.json(
          { success: false, message: "ئەم SKU پێشتر بەکارهاتووە." },
          { status: 400 }
        );
      }
    }

    const [unit, warehouse] = await Promise.all([
      db.unit.findFirst({
        where: { id: data.unitId, companyId },
        select: { id: true },
      }),
      db.warehouse.findFirst({
        where: { id: data.warehouseId, companyId },
        select: { id: true, code: true },
      }),
    ]);

    if (!unit) {
      return NextResponse.json(
        { success: false, message: "یەکە نادروستە." },
        { status: 400 }
      );
    }

    if (!warehouse) {
      return NextResponse.json(
        {
          success: false,
          message: "کۆگا نادروستە، تکایە سەرەتا کۆگا دروست بکە.",
        },
        { status: 400 }
      );
    }

    let barcode = data.barcode ? sanitizeCode128(data.barcode) : "";
    if (!barcode) {
      barcode = (await generateProductBarcodeNumber(companyId)).value;
      barcode = sanitizeCode128(barcode) || generateProductBarcode(sku);
    }

    if (barcode) {
      const duplicateBarcode = await db.product.findFirst({
        where: {
          companyId,
          barcode,
        },
        select: { id: true },
      });

      if (duplicateBarcode) {
        barcode = generateProductBarcode(sku);
      }
    }
    const product = await db.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          companyId,
          name: data.name,
          sku,
          barcode: barcode || null,
          unitId: data.unitId,
          purchasePrice: data.purchasePrice,
          costPrice: data.costPrice || data.purchasePrice,
          salePrice: data.salePrice,
          profitMargin: data.profitMargin,
          currentStock: 0,
          reservedStock: 0,
          minimumStock: data.minimumStock,
          maximumStock: data.maximumStock,
          notes: data.notes || null,
          active: data.active,
          image: data.image || null,
        },
        select: {
          id: true,
          name: true,
          sku: true,
          barcode: true,
          salePrice: true,
          purchasePrice: true,
          currentStock: true,
          active: true,
          unit: { select: { id: true, name: true, symbol: true } },
        },
      });

      const targetWhId = warehouse.id;

      await tx.warehouseStock.upsert({
        where: {
          productId_warehouseId: {
            productId: created.id,
            warehouseId: targetWhId,
          },
        },
        create: {
          companyId,
          productId: created.id,
          warehouseId: targetWhId,
          quantity: 0,
          reserved: 0,
        },
        update: {},
      });

      await applyStockMovement(tx, {
        companyId,
        productId: created.id,
        warehouseId: targetWhId,
        quantity: data.currentStock,
        type: "PRODUCT_CREATE",
        direction: 1,
        userId: user.id,
        reason: "دروستکردنی بەرهەم",
        notes:
          data.currentStock > 0
            ? `بەرهەمی نوێ ${created.sku}`
            : `بەرهەمی نوێ ${created.sku} · کۆگا ٠`,
        referenceType: "PRODUCT",
        referenceId: created.id,
        referenceNo: created.sku,
        allowZero: true,
        auditOnly: data.currentStock <= 0,
      });

      const synced = await tx.product.findUnique({
        where: { id: created.id },
        select: {
          id: true,
          name: true,
          sku: true,
          barcode: true,
          salePrice: true,
          purchasePrice: true,
          currentStock: true,
          active: true,
          unit: { select: { id: true, name: true, symbol: true } },
        },
      });

      if (!synced) {
        throw new Error("PRODUCT_CREATE_SYNC_FAILED");
      }

      return synced;
    });

    await notifySafe({
      companyId,
      title: "بەرهەم دروستکرا",
      message: `${product.name} (${product.sku}) زیادکرا.`,
      category: "PRODUCT",
      priority: "NORMAL",
      href: `/dashboard/products/${product.id}`,
      entityType: "Product",
      entityId: product.id,
    });

    await notifyStockLevels(companyId, [product.id]);

    await auditSafe({
      companyId,
      userId: user.id,
      module: "PRODUCT",
      action: "CREATE",
      entityType: "Product",
      entityId: product.id,
      summary: `بەرهەم دروستکرا: ${product.name}`,
      newValue: {
        id: product.id,
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        salePrice: Number(product.salePrice),
        purchasePrice: Number(product.purchasePrice),
        currentStock: Number(product.currentStock),
        active: product.active,
      },
      req,
    });

    invalidateAfterProduct(companyId);

    return NextResponse.json({
      success: true,
      data: product,
      message: "بەرهەم بە سەرکەوتوویی زیادکرا.",
    });
  } catch (error) {
    console.error("CREATE PRODUCT ERROR:", error);

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
