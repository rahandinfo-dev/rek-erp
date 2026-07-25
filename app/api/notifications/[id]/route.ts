import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma/db";
import { getCurrentUser } from "@/lib/auth/current-user";

type Props = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Props) {
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
    const isRead = body?.isRead !== false;

    const existing = await db.notification.findFirst({
      where: { id, companyId: user.companyId, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "ئاگاداری نەدۆزرایەوە." },
        { status: 404 }
      );
    }

    const updated = await db.notification.update({
      where: { id },
      data: {
        isRead,
        readAt: isRead ? new Date() : null,
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: isRead ? "وەک خوێندراو نیشانکرا." : "وەک نەخوێندراو نیشانکرا.",
    });
  } catch (error) {
    console.error("PATCH NOTIFICATION ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: Props) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "تکایە سەرەتا بچۆ ژوورەوە." },
        { status: 401 }
      );
    }

    const { id } = await params;

    const existing = await db.notification.findFirst({
      where: { id, companyId: user.companyId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "ئاگاداری نەدۆزرایەوە." },
        { status: 404 }
      );
    }

    // Soft-delete only — row remains forever.
    await db.notification.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      message: "ئاگاداری شاردرەوە.",
    });
  } catch (error) {
    console.error("DELETE NOTIFICATION ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
