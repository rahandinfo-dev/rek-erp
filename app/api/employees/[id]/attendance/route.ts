import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { attendanceSchema } from "@/lib/validators/employee";
import {
  logEmployeeHistory,
  toDateOnly,
} from "@/lib/employees/history";
import { ATTENDANCE_STATUS_LABELS } from "@/lib/employees/labels";

function parseTime(value?: string | null) { return value ? new Date(value) : null; }

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "تکایە سەرەتا بچۆ ژوورەوە." },
        { status: 401 }
      );
    }

    const { id } = await params;
    const year = Number(req.nextUrl.searchParams.get("year"));
    const month = Number(req.nextUrl.searchParams.get("month"));

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

    const where: {
      employeeId: string;
      companyId: string;
      date?: { gte: Date; lte: Date };
    } = {
      employeeId: id,
      companyId: user.companyId,
    };

    if (year && month) {
      const start = new Date(Date.UTC(year, month - 1, 1));
      const end = new Date(Date.UTC(year, month, 0));
      where.date = { gte: start, lte: end };
    }

    const attendances = await db.attendance.findMany({
      where,
      orderBy: { date: "asc" },
    });

    return NextResponse.json({ success: true, data: attendances });
  } catch (error) {
    console.error("GET ATTENDANCE ERROR:", error);
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
    const parsed = attendanceSchema.safeParse(body);

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

    const date = toDateOnly(parsed.data.date);

    const attendance = await db.attendance.upsert({
      where: {
        employeeId_date: {
          employeeId: id,
          date,
        },
      },
      create: {
        companyId: user.companyId,
        employeeId: id,
        date,
        status: parsed.data.status,
        notes: parsed.data.notes || null,
        checkIn: parseTime(parsed.data.checkIn),
        checkOut: parseTime(parsed.data.checkOut),
        lateMinutes: parsed.data.lateMinutes,
        isAbsent: parsed.data.status === "ABSENT",
        isLeave: parsed.data.status === "LEAVE",
      },
      update: {
        status: parsed.data.status,
        notes: parsed.data.notes || null,
        checkIn: parseTime(parsed.data.checkIn),
        checkOut: parseTime(parsed.data.checkOut),
        lateMinutes: parsed.data.lateMinutes,
        isAbsent: parsed.data.status === "ABSENT",
        isLeave: parsed.data.status === "LEAVE",
      },
    });

    await logEmployeeHistory({
      companyId: user.companyId,
      employeeId: id,
      action: "ATTENDANCE",
      message: `ئامادەبوون: ${ATTENDANCE_STATUS_LABELS[parsed.data.status]} · ${parsed.data.date.slice(0, 10)}`,
      actorId: user.id,
      metadata: { status: parsed.data.status, date: parsed.data.date },
    });

    return NextResponse.json({
      success: true,
      message: "ئامادەبوون پاشەکەوتکرا.",
      data: attendance,
    });
  } catch (error) {
    console.error("POST ATTENDANCE ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
