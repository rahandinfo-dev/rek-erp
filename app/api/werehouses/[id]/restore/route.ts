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
    const warehouse = await db.warehouse.findFirst({
      where: { id, companyId: user.companyId, deletedAt: { not: null } },
    });

    if (!warehouse) {
      return NextResponse.json(
        { success: false, message: "کۆگا نەدۆزرایەوە." },
        { status: 404 }
      );
    }

    if (!warehouse.deletedAt) {
      return NextResponse.json({ success: true, message: tServer.t("api.alreadyActive") });
    }

    await db.warehouse.update({
      where: { id },
      data: { active: true, deletedAt: null, deletedById: null },
    });

    await auditSafe({
      companyId: user.companyId,
      userId: user.id,
      module: "WAREHOUSE",
      action: "RESTORE",
      entityType: "کۆگا",
      entityId: id,
      summary: `Warehouse restored: ${warehouse.name}`,
      req,
    });

    return NextResponse.json({
      success: true,
      message: "کۆگا گەڕێنرایەوە.",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
