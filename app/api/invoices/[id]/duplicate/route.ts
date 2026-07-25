import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma/db";
import { getCurrentUser } from "@/lib/auth/current-user";

type Props = { params: Promise<{ id: string }> };

/** Returns sale draft fields so the UI can open Create Sale prefilled. */
export async function GET(_req: NextRequest, { params }: Props) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "تکایە سەرەتا بچۆ ژوورەوە." },
        { status: 401 }
      );
    }

    const { id } = await params;

    const invoice = await db.invoice.findFirst({
      where: { id, companyId: user.companyId },
      include: {
        sale: {
          include: {
            items: {
              select: {
                productId: true,
                quantity: true,
                unitPrice: true,
                total: true,
                currency: true,
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { success: false, message: "پسوولە نەدۆزرایەوە." },
        { status: 404 }
      );
    }

    const sale = invoice.sale;

    return NextResponse.json({
      success: true,
      data: {
        customerId: sale.customerId,
        warehouseId: sale.warehouseId,
        saleDate: new Date().toISOString().slice(0, 10),
        discount: Number(sale.discount),
        tax: Number(sale.tax),
        paymentMethod: sale.paymentMethod,
        notes: sale.notes ?? "",
        items: sale.items.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          total: Number(item.total),
          currency: item.currency === "USD" ? "USD" : "IQD",
        })),
      },
    });
  } catch (error) {
    console.error("DUPLICATE INVOICE ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
