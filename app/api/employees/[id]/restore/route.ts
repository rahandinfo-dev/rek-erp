import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { auditSafe } from "@/lib/audit/log";
import { tServer } from "@/lib/i18n";
import { requiredPreviousStateValue } from "@/lib/recycle/state";

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
    const employee = await db.employee.findFirst({
      where: { id, companyId: user.companyId, deletedAt: { not: null } },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, message: "کارمەند نەدۆزرایەوە." },
        { status: 404 }
      );
    }

    if (!employee.deletedAt) {
      return NextResponse.json({ success: true, message: tServer.t("api.alreadyActive") });
    }

    const trashEntry = await db.recycleBinEntry.findFirst({
      where: {
        companyId: user.companyId,
        entityId: id,
        moduleKey: "employees",
        status: "deleted",
      },
      select: { metadata: true },
    });
    const restoreStatus = requiredPreviousStateValue(
      trashEntry?.metadata,
      "status",
      ["ACTIVE", "INACTIVE", "SUSPENDED", "ON_LEAVE", "ABSENT", "LATE", "TERMINATED"] as const
    );
    if (!restoreStatus) {
      return NextResponse.json(
        { success: false, message: "دۆخی پێشووی ئەم کارمەندە لە سەبەتەی زبڵدا نەدۆزرایەوە؛ گەڕاندنەوە وەستێنرا بۆ پاراستنی داتا." },
        { status: 409 }
      );
    }

    await db.employee.update({
      where: { id },
      data: {
        status: restoreStatus,
        deletedAt: null,
        deletedById: null,
      },
    });

    await auditSafe({
      companyId: user.companyId,
      userId: user.id,
      module: "EMPLOYEE",
      action: "RESTORE",
      entityType: "کارمەند",
      entityId: id,
      summary: `Employee restored: ${employee.fullName}`,
      req,
    });

    return NextResponse.json({
      success: true,
      message: "کارمەند گەڕێنرایەوە.",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
