import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { auditSafe } from "@/lib/audit/log";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const category = await db.category.findFirst({
      where: { id, companyId: user.companyId },
    });

    if (!category) {
      return NextResponse.json(
        { success: false, message: "پۆل نەدۆزرایەوە." },
        { status: 404 }
      );
    }

    if (category.active) {
      return NextResponse.json({ success: true, message: "Already active." });
    }

    await db.category.update({ where: { id }, data: { active: true } });

    await auditSafe({
      companyId: user.companyId,
      userId: user.id,
      module: "SYSTEM",
      action: "RESTORE",
      entityType: "Category",
      entityId: id,
      summary: `Category restored: ${category.name}`,
      req,
    });

    return NextResponse.json({
      success: true,
      message: "پۆل گەڕێنرایەوە.",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
