import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { notifySafe } from "@/lib/notifications/create";

type Props = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Props) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "تکایە سەرەتا بچۆ ژوورەوە." },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const filename =
      typeof body?.filename === "string" ? body.filename : undefined;

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

    const event = await db.invoicePdfEvent.create({
      data: {
        invoiceId: invoice.id,
        userId: user.id,
        userName: user.fullName,
        filename: filename || `${invoice.invoiceNo}.pdf`,
        note: "PDF دروستکرا / داگیرا",
      },
    });

    await notifySafe({
      companyId: user.companyId,
      userId: user.id,
      title: "PDF دروستکرا",
      message: `PDFی پسوولەی ${invoice.invoiceNo} دروستکرا.`,
      category: "INVOICE",
      priority: "NORMAL",
      href: `/dashboard/invoices/${invoice.id}`,
      entityType: "پسوولە",
      entityId: invoice.id,
      metadata: { action: "PDF", eventId: event.id },
    });

    return NextResponse.json({
      success: true,
      data: event,
      message: "مێژووی PDF تۆمارکرا.",
    });
  } catch (error) {
    console.error("INVOICE PDF HISTORY ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
