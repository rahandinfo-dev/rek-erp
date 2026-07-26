import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { employeeSchema } from "@/lib/validators/employee";
import { logEmployeeHistory, parseOptionalDate } from "@/lib/employees/history";
import { notifySafe } from "@/lib/notifications/create";
import { auditSafe } from "@/lib/audit/log";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "تکایە سەرەتا بچۆ ژوورەوە." },
        { status: 401 }
      );
    }

    const employees = await db.employee.findMany({
      where: { companyId: user.companyId },
      include: {
        createdBy: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: employees });
  } catch (error) {
    console.error("GET EMPLOYEES ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "تکایە سەرەتا بچۆ ژوورەوە." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = employeeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: parsed.error.issues[0]?.message || "زانیاری نادروستە.",
          errors: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const data = parsed.data;
    let username = (data.username || "").trim().toLowerCase();
    if (!username) {
      const { generateEmployeeUsername } = await import(
        "@/lib/numbering/engine"
      );
      username = (
        await generateEmployeeUsername(user.companyId)
      ).value.toLowerCase();
    } else {
      const exists = await db.employee.findFirst({
        where: { companyId: user.companyId, username },
      });
      if (exists) {
        return NextResponse.json(
          { success: false, message: "ئەم ناوی بەکارهێنەرە پێشتر بەکارهاتووە." },
          { status: 400 }
        );
      }
    }

    const employee = await db.employee.create({
      data: {
        companyId: user.companyId,
        photo: data.photo || null,
        fullName: data.fullName.trim(),
        username,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        nationalId: data.nationalId || null,
        position: data.position || null,
        department: data.department || null,
        role: data.role,
        status: data.status,
        monthlySalary: data.monthlySalary,
        nextSalaryDate: parseOptionalDate(data.nextSalaryDate),
        dateJoined: parseOptionalDate(data.dateJoined) || new Date(),
        notes: data.notes || null,
        createdById: user.id,
      },
      include: {
        createdBy: { select: { id: true, fullName: true } },
      },
    });

    await logEmployeeHistory({
      companyId: user.companyId,
      employeeId: employee.id,
      action: "CREATED",
      message: `${employee.fullName} زیادکرا.`,
      actorId: user.id,
    });

    await notifySafe({
      companyId: user.companyId,
      title: "کارمەند زیادکرا",
      message: `${employee.fullName} (${employee.username}) زیادکرا.`,
      category: "EMPLOYEE",
      priority: "NORMAL",
      href: `/dashboard/employees/${employee.id}`,
      entityType: "کارمەند",
      entityId: employee.id,
    });

    await auditSafe({
      companyId: user.companyId,
      userId: user.id,
      module: "EMPLOYEE",
      action: "CREATE",
      entityType: "کارمەند",
      entityId: employee.id,
      summary: `کارمەند ${employee.fullName} زیادکرا`,
      newValue: { username: employee.username, position: employee.position },
      req,
    });

    return NextResponse.json({
      success: true,
      message: "کارمەند بە سەرکەوتوویی زیادکرا.",
      data: employee,
    });
  } catch (error) {
    console.error("POST EMPLOYEE ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
