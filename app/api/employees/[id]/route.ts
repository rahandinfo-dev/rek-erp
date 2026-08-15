import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { employeeSchema } from "@/lib/validators/employee";
import { logEmployeeHistory, parseOptionalDate } from "@/lib/employees/history";
import { notifySafe } from "@/lib/notifications/create";
import { auditSafe } from "@/lib/audit/log";
import { isCompanyAdministrator } from "@/lib/auth/authorization";

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
      where: { id, companyId: user.companyId, deletedAt: null },
      include: {
        createdBy: { select: { id: true, fullName: true } },
        history: {
          orderBy: { createdAt: "desc" },
          take: 40,
          include: { actor: { select: { id: true, fullName: true } } },
        },
        attendances: {
          orderBy: { date: "desc" },
          take: 60,
        },
        leaveRequests: {
          orderBy: { createdAt: "desc" },
          take: 30,
          include: {
            reviewedBy: { select: { id: true, fullName: true } },
          },
        },
        salaryPayments: {
          orderBy: [{ year: "desc" }, { month: "desc" }],
          take: 36,
        },
      },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, message: "کارمەند نەدۆزرایەوە." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: employee });
  } catch (error) {
    console.error("GET EMPLOYEE ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
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
    const parsed = employeeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: parsed.error.issues[0]?.message || "زانیاری نادروستە.",
        },
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

    const data = parsed.data;
    const username = (data.username || existing.username).trim().toLowerCase();
    if (!username) {
      return NextResponse.json(
        { success: false, message: "ناوی بەکارهێنەر پێویستە." },
        { status: 400 }
      );
    }

    const duplicate = await db.employee.findFirst({
      where: {
        companyId: user.companyId,
        username,
        NOT: { id },
      },
    });

    if (duplicate) {
      return NextResponse.json(
        { success: false, message: "ئەم ناوی بەکارهێنەرە پێشتر بەکارهاتووە." },
        { status: 400 }
      );
    }

    const employee = await db.employee.update({
      where: { id },
      data: {
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
        dateJoined: parseOptionalDate(data.dateJoined) || existing.dateJoined,
        notes: data.notes || null,
      },
      include: {
        createdBy: { select: { id: true, fullName: true } },
      },
    });

    await logEmployeeHistory({
      companyId: user.companyId,
      employeeId: employee.id,
      action: "UPDATED",
      message: `${employee.fullName} نوێکرایەوە.`,
      actorId: user.id,
    });

    await notifySafe({
      companyId: user.companyId,
      title: "کارمەند نوێکرایەوە",
      message: `${employee.fullName} نوێکرایەوە.`,
      category: "EMPLOYEE",
      href: `/dashboard/employees/${employee.id}`,
      entityType: "کارمەند",
      entityId: employee.id,
    });

    await auditSafe({
      companyId: user.companyId,
      userId: user.id,
      module: "EMPLOYEE",
      action: "UPDATE",
      entityType: "کارمەند",
      entityId: employee.id,
      summary: `کارمەند ${employee.fullName} نوێکرایەوە`,
      oldValue: {
        fullName: existing.fullName,
        phone: existing.phone,
        position: existing.position,
        department: existing.department,
        status: existing.status,
        role: existing.role,
      },
      newValue: {
        fullName: employee.fullName,
        phone: employee.phone,
        position: employee.position,
        department: employee.department,
        status: employee.status,
        role: employee.role,
      },
      req,
    });

    return NextResponse.json({
      success: true,
      message: "کارمەند نوێکرایەوە.",
      data: employee,
    });
  } catch (error) {
    console.error("PUT EMPLOYEE ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "تکایە سەرەتا بچۆ ژوورەوە." },
        { status: 401 }
      );
    }

    const { id } = await params;
    const purge = req.nextUrl.searchParams.get("purge") === "1";
    const existing = await db.employee.findFirst({
      where: {
        id,
        companyId: user.companyId,
        deletedAt: purge ? { not: null } : null,
      },
      include: {
        _count: {
          select: {
            attendances: true,
            leaveRequests: true,
            salaryPayments: true,
            history: true,
            deductions: true,
            performances: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "کارمەند نەدۆزرایەوە." },
        { status: 404 }
      );
    }

    if (purge) {
      if (!(await isCompanyAdministrator(user.companyId, user.id))) {
        return NextResponse.json(
          { success: false, message: "تەنها بەڕێوەبەری کۆمپانیا دەتوانێت بە هەمیشەیی بسڕێتەوە." },
          { status: 403 }
        );
      }
      if (!existing.deletedAt) {
        return NextResponse.json(
          { success: false, message: "سەرەتا تۆمارەکە بگوازەرەوە بۆ سەبەتەی زبڵ." },
          { status: 400 }
        );
      }
      if (Object.values(existing._count).some((count) => count > 0)) {
        return NextResponse.json(
          { success: false, message: "ناتوانرێت بە هەمیشەیی بسڕدرێتەوە؛ داتای پەیوەست و مێژوو هەیە." },
          { status: 400 }
        );
      }
      await db.employee.delete({ where: { id: existing.id } });
      await auditSafe({
        companyId: user.companyId,
        userId: user.id,
        module: "EMPLOYEE",
        action: "DELETE",
        entityType: "کارمەند",
        entityId: existing.id,
        summary: `کارمەند بە هەمیشەیی سڕایەوە: ${existing.fullName}`,
        oldValue: { fullName: existing.fullName, username: existing.username },
        metadata: { permanent: true },
        req,
      });
      return NextResponse.json({
        success: true,
        permanent: true,
        message: "کارمەند بە هەمیشەیی سڕایەوە.",
      });
    }

    if (existing.deletedAt) {
      return NextResponse.json(
        { success: false, message: "ئەم کارمەندە پێشتر لە سەبەتەی زبڵدایە." },
        { status: 400 }
      );
    }

    await db.employee.update({
      where: { id },
      data: {
        status: "INACTIVE",
        deletedAt: new Date(),
        deletedById: user.id,
      },
    });

    await notifySafe({
      companyId: user.companyId,
      title: "کارمەند سڕایەوە",
      message: `${existing.fullName} ئەرشیفکرا — Undo بەردەستە.`,
      category: "EMPLOYEE",
      priority: "HIGH",
      href: "/dashboard/employees",
      entityType: "کارمەند",
      entityId: existing.id,
    });

    await auditSafe({
      companyId: user.companyId,
      userId: user.id,
      module: "EMPLOYEE",
      action: "DELETE",
      entityType: "کارمەند",
      entityId: existing.id,
      summary: `کارمەند ${existing.fullName} سڕایەوە (soft)`,
      oldValue: { username: existing.username, status: existing.status },
      newValue: { status: "INACTIVE" },
      req,
    });

    return NextResponse.json({
      success: true,
      message: "کارمەند سڕایەوە — Undo بەردەستە.",
    });
  } catch (error) {
    console.error("DELETE EMPLOYEE ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
