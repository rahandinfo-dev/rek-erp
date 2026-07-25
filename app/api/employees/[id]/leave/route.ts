import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { leaveRequestSchema } from "@/lib/validators/employee";
import { logEmployeeHistory, toDateOnly } from "@/lib/employees/history";
import { LEAVE_TYPE_LABELS } from "@/lib/employees/labels";
import { notifySafe } from "@/lib/notifications/create";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "تکایە سەرەتا بچۆ ژوورەوە." },
        { status: 401 }
      );
    }

    const { id } = await params;

    const employee = await db.employee.findFirst({
      where: { id, companyId: user.companyId },
      select: { id: true },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, message: "کارمەند نەدۆزرایەوە." },
        { status: 404 }
      );
    }

    const leaves = await db.leaveRequest.findMany({
      where: { employeeId: id, companyId: user.companyId },
      include: {
        reviewedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: leaves });
  } catch (error) {
    console.error("GET LEAVE ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "تکایە سەرەتا بچۆ ژوورەوە." },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = leaveRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: parsed.error.issues[0]?.message || "زانیاری نادروستە.",
        },
        { status: 400 }
      );
    }

    const employee = await db.employee.findFirst({
      where: { id, companyId: user.companyId },
      select: { id: true, fullName: true },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, message: "کارمەند نەدۆزرایەوە." },
        { status: 404 }
      );
    }

    const startDate = toDateOnly(parsed.data.startDate);
    const endDate = toDateOnly(parsed.data.endDate);

    if (endDate < startDate) {
      return NextResponse.json(
        { success: false, message: "بەرواری کۆتایی نابێت پێش دەستپێک بێت." },
        { status: 400 }
      );
    }

    const leave = await db.leaveRequest.create({
      data: {
        companyId: user.companyId,
        employeeId: id,
        leaveType: parsed.data.leaveType,
        reason: parsed.data.reason || null,
        startDate,
        endDate,
        status: "PENDING",
      },
    });

    await logEmployeeHistory({
      companyId: user.companyId,
      employeeId: id,
      action: "LEAVE_REQUESTED",
      message: `داواکاری مۆڵەت: ${LEAVE_TYPE_LABELS[parsed.data.leaveType]}`,
      actorId: user.id,
      metadata: {
        leaveType: parsed.data.leaveType,
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate,
      },
    });

    await notifySafe({
      companyId: user.companyId,
      title: "داواکاری مۆڵەت",
      message: `${employee.fullName} داوای مۆڵەتی کرد.`,
      category: "EMPLOYEE",
      href: `/dashboard/employees/${id}`,
      entityType: "LeaveRequest",
      entityId: leave.id,
    });

    return NextResponse.json({
      success: true,
      message: "داواکاری مۆڵەت نێردرا.",
      data: leave,
    });
  } catch (error) {
    console.error("POST LEAVE ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
