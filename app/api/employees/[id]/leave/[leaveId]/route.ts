import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { leaveStatusSchema } from "@/lib/validators/employee";
import { logEmployeeHistory } from "@/lib/employees/history";
import { LEAVE_STATUS_LABELS } from "@/lib/employees/labels";
import { notifySafe } from "@/lib/notifications/create";

type Params = { params: Promise<{ id: string; leaveId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "تکایە سەرەتا بچۆ ژوورەوە." },
        { status: 401 }
      );
    }

    const { id, leaveId } = await params;
    const body = await req.json();
    const parsed = leaveStatusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "دۆخ نادروستە." },
        { status: 400 }
      );
    }

    const leave = await db.leaveRequest.findFirst({
      where: {
        id: leaveId,
        employeeId: id,
        companyId: user.companyId,
      },
      include: { employee: { select: { fullName: true } } },
    });

    if (!leave) {
      return NextResponse.json(
        { success: false, message: "داواکاری مۆڵەت نەدۆزرایەوە." },
        { status: 404 }
      );
    }

    if (leave.status !== "PENDING") {
      return NextResponse.json(
        { success: false, message: "ئەم داواکارییە پێشتر یەکلا کراوەتەوە." },
        { status: 400 }
      );
    }

    const updated = await db.leaveRequest.update({
      where: { id: leaveId },
      data: {
        status: parsed.data.status,
        reviewedAt: new Date(),
        reviewedById: user.id,
      },
      include: {
        reviewedBy: { select: { id: true, fullName: true } },
      },
    });

    await logEmployeeHistory({
      companyId: user.companyId,
      employeeId: id,
      action: `LEAVE_${parsed.data.status}`,
      message: `مۆڵەت ${LEAVE_STATUS_LABELS[parsed.data.status]} کرا.`,
      actorId: user.id,
      metadata: { leaveId, status: parsed.data.status },
    });

    await notifySafe({
      companyId: user.companyId,
      title: "مۆڵەت یەکلا کرایەوە",
      message: `${leave.employee.fullName}: ${LEAVE_STATUS_LABELS[parsed.data.status]}`,
      category: "EMPLOYEE",
      href: `/dashboard/employees/${id}`,
      entityType: "LeaveRequest",
      entityId: leaveId,
    });

    return NextResponse.json({
      success: true,
      message: "دۆخی مۆڵەت نوێکرایەوە.",
      data: updated,
    });
  } catch (error) {
    console.error("PATCH LEAVE ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
