import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { normalizeScanCode } from "@/lib/barcode/lookup";

/**
 * Exact barcode (or SKU) lookup for scanners — company scoped.
 * GET /api/products/by-barcode?code=XXX
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "تکایە سەرەتا بچۆ ژوورەوە." },
        { status: 401 }
      );
    }

    const code = normalizeScanCode(req.nextUrl.searchParams.get("code") || "");
    if (!code) {
      return NextResponse.json(
        { success: false, message: "بارکۆد بەتاڵە." },
        { status: 400 }
      );
    }

    const product =
      (await db.product.findFirst({
        where: {
          companyId: user.companyId,
          barcode: code,
        },
        select: {
          id: true,
          name: true,
          sku: true,
          barcode: true,
          salePrice: true,
          purchasePrice: true,
          currentStock: true,
          reservedStock: true,
          active: true,
          image: true,
          unit: { select: { id: true, name: true, symbol: true } },
        },
      })) ||
      (await db.product.findFirst({
        where: {
          companyId: user.companyId,
          sku: { equals: code, mode: "insensitive" },
        },
        select: {
          id: true,
          name: true,
          sku: true,
          barcode: true,
          salePrice: true,
          purchasePrice: true,
          currentStock: true,
          reservedStock: true,
          active: true,
          image: true,
          unit: { select: { id: true, name: true, symbol: true } },
        },
      }));

    if (!product) {
      return NextResponse.json({
        success: true,
        data: null,
        found: false,
        code,
        message: "بەرهەم نەدۆزرایەوە.",
      });
    }

    return NextResponse.json({
      success: true,
      found: true,
      code,
      data: {
        ...product,
        salePrice: Number(product.salePrice),
        purchasePrice: Number(product.purchasePrice),
        currentStock: Number(product.currentStock),
        reservedStock: Number(product.reservedStock),
      },
    });
  } catch (error) {
    console.error("BARCODE LOOKUP ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
