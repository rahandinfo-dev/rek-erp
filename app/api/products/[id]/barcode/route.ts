import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma/db";
import { getCurrentCompanyId } from "@/lib/auth/current-user";
import { generateProductBarcode, sanitizeCode128 } from "@/lib/barcode/code128";
import { notifySafe } from "@/lib/notifications/create";

type Props = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Props) {
  try {
    const companyId = await getCurrentCompanyId();
    if (!companyId) {
      return NextResponse.json(
        { success: false, message: "تکایە سەرەتا بچۆ ژوورەوە." },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const regenerate = body?.regenerate === true;
    const custom =
      typeof body?.barcode === "string"
        ? sanitizeCode128(body.barcode)
        : "";

    const product = await db.product.findFirst({
      where: { id, companyId },
      select: { id: true, name: true, sku: true, barcode: true },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, message: "بەرهەم نەدۆزرایەوە." },
        { status: 404 }
      );
    }

    if (product.barcode && !regenerate && !custom) {
      return NextResponse.json({
        success: true,
        data: { barcode: product.barcode },
        message: "بارکۆد پێشتر هەیە.",
      });
    }

    let barcode = custom;
    if (!barcode) {
      try {
        const { generateProductBarcodeNumber } = await import(
          "@/lib/numbering/engine"
        );
        barcode = (await generateProductBarcodeNumber(companyId)).value;
      } catch {
        barcode = generateProductBarcode(product.sku);
      }
    }
    barcode = sanitizeCode128(barcode) || generateProductBarcode(product.sku);

    // Ensure uniqueness within company
    for (let i = 0; i < 5; i++) {
      const exists = await db.product.findFirst({
        where: {
          companyId,
          barcode,
          NOT: { id: product.id },
        },
        select: { id: true },
      });
      if (!exists) break;
      barcode = generateProductBarcode(product.sku);
    }

    const updated = await db.product.update({
      where: { id: product.id },
      data: { barcode },
      select: { id: true, name: true, sku: true, barcode: true },
    });

    await notifySafe({
      companyId,
      title: "بارکۆد دروستکرا",
      message: `Code128 بۆ ${updated.name}: ${updated.barcode}`,
      category: "PRODUCT",
      priority: "LOW",
      href: "/dashboard/barcode",
      entityType: "Product",
      entityId: updated.id,
      metadata: { barcode: updated.barcode, format: "CODE128" },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: "بارکۆدی Code128 پاشەکەوتکرا.",
    });
  } catch (error) {
    console.error("PRODUCT BARCODE ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
