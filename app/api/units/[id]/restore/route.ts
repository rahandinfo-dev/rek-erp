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
    const unit = await db.unit.findFirst({
      where: { id, companyId: user.companyId },
    });

    if (!unit) {
      return NextResponse.json(
        { success: false, message: "یەکە نەدۆزرایەوە." },
        { status: 404 }
      );
    }

    if (unit.active) {
      return NextResponse.json({ success: true, message: "Already active." });
    }

    await db.unit.update({ where: { id }, data: { active: true } });

    await auditSafe({
      companyId: user.companyId,
      userId: user.id,
      module: "UNIT",
      action: "RESTORE",
      entityType: "Unit",
      entityId: id,
      summary: `Unit restored: ${unit.name}`,
      req,
    });

    return NextResponse.json({
      success: true,
      message: "یەکە گەڕێنرایەوە.",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
