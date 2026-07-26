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
    const warehouse = await db.warehouse.findFirst({
      where: { id, companyId: user.companyId },
    });

    if (!warehouse) {
      return NextResponse.json(
        { success: false, message: "کۆگا نەدۆزرایەوە." },
        { status: 404 }
      );
    }

    if (warehouse.active) {
      return NextResponse.json({ success: true, message: "Already active." });
    }

    await db.warehouse.update({ where: { id }, data: { active: true } });

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
