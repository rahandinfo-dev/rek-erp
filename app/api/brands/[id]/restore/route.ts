import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { auditSafe } from "@/lib/audit/log";
import { tServer } from "@/lib/i18n";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: tServer.t("api.unauthorized") },
        { status: 401 }
      );
    }

    const { id } = await params;
    const brand = await db.brand.findFirst({
      where: { id, companyId: user.companyId },
    });

    if (!brand) {
      return NextResponse.json(
        { success: false, message: "براند نەدۆزرایەوە." },
        { status: 404 }
      );
    }

    if (brand.active) {
      return NextResponse.json({ success: true, message: tServer.t("api.alreadyActive") });
    }

    await db.brand.update({ where: { id }, data: { active: true } });

    await auditSafe({
      companyId: user.companyId,
      userId: user.id,
      module: "SYSTEM",
      action: "RESTORE",
      entityType: "Brand",
      entityId: id,
      summary: `Brand restored: ${brand.name}`,
      req,
    });

    return NextResponse.json({
      success: true,
      message: "براند گەڕێنرایەوە.",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
