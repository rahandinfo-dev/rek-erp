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
    const employee = await db.employee.findFirst({
      where: { id, companyId: user.companyId },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, message: "کارمەند نەدۆزرایەوە." },
        { status: 404 }
      );
    }

    if (employee.status === "ACTIVE") {
      return NextResponse.json({ success: true, message: "Already active." });
    }

    await db.employee.update({
      where: { id },
      data: { status: "ACTIVE" },
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
