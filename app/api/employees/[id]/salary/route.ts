import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { salarySchema } from "@/lib/validators/employee";
import {
  logEmployeeHistory,
  parseOptionalDate,
} from "@/lib/employees/history";
import { SALARY_STATUS_LABELS } from "@/lib/employees/labels";
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
      select: {
        id: true,
        monthlySalary: true,
        nextSalaryDate: true,
      },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, message: "کارمەند نەدۆزرایەوە." },
        { status: 404 }
      );
    }

    const history = await db.salaryPayment.findMany({
      where: { employeeId: id, companyId: user.companyId },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    return NextResponse.json({
      success: true,
      data: {
        monthlySalary: employee.monthlySalary,
        nextSalaryDate: employee.nextSalaryDate,
        history,
      },
    });
  } catch (error) {
    console.error("GET SALARY ERROR:", error);
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
    const parsed = salarySchema.safeParse(body);

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
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, message: "کارمەند نەدۆزرایەوە." },
        { status: 404 }
      );
    }

    const data = parsed.data;
    const paymentDate = parseOptionalDate(data.paymentDate);
    const nextSalaryDate = parseOptionalDate(data.nextSalaryDate);

    const payment = await db.salaryPayment.create({
      data: { companyId: user.companyId, employeeId: id, amount: data.amount,
        remainingAmount: data.remainingAmount, currency: data.currency, paymentMethod: data.paymentMethod,
        month: data.month, year: data.year, paymentDate, nextSalaryDate, status: data.status, notes: data.notes || null },
    });

    if (nextSalaryDate) {
      await db.employee.update({ where: { id }, data: { nextSalaryDate } });
    }

    await logEmployeeHistory({
      companyId: user.companyId,
      employeeId: id,
      action: "SALARY",
      message: `مووچەی ${data.month}/${data.year}: ${SALARY_STATUS_LABELS[data.status]}`,
      actorId: user.id,
      metadata: {
        month: data.month,
        year: data.year,
        amount: data.amount,
        status: data.status,
      },
    });

    await notifySafe({
      companyId: user.companyId,
      title: "مووچە تۆمارکرا",
      message: `${employee.fullName} · ${data.month}/${data.year}`,
      category: "EMPLOYEE",
      href: `/dashboard/employees/${id}`,
      entityType: "SalaryPayment",
      entityId: payment.id,
    });

    return NextResponse.json({
      success: true,
      message: "مووچە پاشەکەوتکرا.",
      data: payment,
    });
  } catch (error) {
    console.error("POST SALARY ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
