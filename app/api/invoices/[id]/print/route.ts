import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { notifySafe } from "@/lib/notifications/create";

type Props = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Props) {
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
      select: { id: true, invoiceNo: true },
    });

    if (!invoice) {
      return NextResponse.json(
        { success: false, message: "پسوولە نەدۆزرایەوە." },
        { status: 404 }
      );
    }

    const event = await db.invoicePrintEvent.create({
      data: {
        invoiceId: invoice.id,
        userId: user.id,
        userName: user.fullName,
        note: "چاپکرا",
      },
    });

    await notifySafe({
      companyId: user.companyId,
      userId: user.id,
      title: "پسوولە چاپکرا",
      message: `پسوولەی ${invoice.invoiceNo} چاپکرا.`,
      category: "INVOICE",
      priority: "NORMAL",
      href: `/dashboard/invoices/${invoice.id}`,
      entityType: "پسوولە",
      entityId: invoice.id,
      metadata: { action: "PRINT", eventId: event.id },
    });

    return NextResponse.json({
      success: true,
      data: event,
      message: "مێژووی چاپ تۆمارکرا.",
    });
  } catch (error) {
    console.error("INVOICE PRINT HISTORY ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
