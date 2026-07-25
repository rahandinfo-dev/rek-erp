import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { employeeStatusSchema } from "@/lib/validators/employee";
import { logEmployeeHistory } from "@/lib/employees/history";
import { EMPLOYEE_STATUS_LABELS } from "@/lib/employees/labels";
import { notifySafe } from "@/lib/notifications/create";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
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
    const parsed = employeeStatusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "دۆخ نادروستە." },
        { status: 400 }
      );
    }

    const existing = await db.employee.findFirst({
      where: { id, companyId: user.companyId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "کارمەند نەدۆزرایەوە." },
        { status: 404 }
      );
    }

    const status = parsed.data.status;
    const employee = await db.employee.update({
      where: { id },
      data: { status },
    });

    const action =
      status === "SUSPENDED"
        ? "SUSPENDED"
        : status === "ACTIVE"
          ? "ACTIVATED"
          : "STATUS_CHANGED";

    await logEmployeeHistory({
      companyId: user.companyId,
      employeeId: employee.id,
      action,
      message: `دۆخ بوو بە ${EMPLOYEE_STATUS_LABELS[status] || status}.`,
      actorId: user.id,
      metadata: { status },
    });

    await notifySafe({
      companyId: user.companyId,
      title: "دۆخی کارمەند گۆڕا",
      message: `${employee.fullName}: ${EMPLOYEE_STATUS_LABELS[status]}`,
      category: "EMPLOYEE",
      href: `/dashboard/employees/${employee.id}`,
      entityType: "Employee",
      entityId: employee.id,
    });

    return NextResponse.json({
      success: true,
      message: "دۆخی کارمەند نوێکرایەوە.",
      data: employee,
    });
  } catch (error) {
    console.error("PATCH EMPLOYEE STATUS ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
