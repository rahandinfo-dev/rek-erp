import { db } from "@/lib/prisma/db";
import { runSalaryAlerts } from "@/lib/employees/salary-alerts";

function monthRange(base = new Date()) {
  const start = new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), 1)
  );
  const end = new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0)
  );
  return { start, end };
}

function dateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function buildEmployeeReports(companyId: string) {
  const now = new Date();
  const { start: monthStart, end: monthEnd } = monthRange(now);
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const upcomingEnd = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);

  const [
    employees,
    attendances,
    leaves,
    salaries,
    upcomingSalaries,
    recentAttendance,
    allLeaves,
    salaryHistory,
    alertResults,
  ] = await Promise.all([
    db.employee.findMany({
      where: { companyId },
      select: {
        id: true,
        fullName: true,
        username: true,
        photo: true,
        phone: true,
        department: true,
        position: true,
        role: true,
        status: true,
        monthlySalary: true,
        nextSalaryDate: true,
        dateJoined: true,
      },
      orderBy: { fullName: "asc" },
    }),
    db.attendance.findMany({
      where: {
        companyId,
        date: { gte: monthStart, lte: monthEnd },
      },
      include: {
        employee: {
          select: { id: true, fullName: true, username: true, department: true },
        },
      },
      orderBy: { date: "desc" },
    }),
    db.leaveRequest.findMany({
      where: {
        companyId,
        OR: [
          { startDate: { gte: monthStart, lte: monthEnd } },
          { endDate: { gte: monthStart, lte: monthEnd } },
          {
            startDate: { lte: monthStart },
            endDate: { gte: monthEnd },
          },
        ],
      },
      include: {
        employee: {
          select: { id: true, fullName: true, username: true },
        },
        reviewedBy: { select: { fullName: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.salaryPayment.findMany({
      where: {
        companyId,
        month: now.getUTCMonth() + 1,
        year: now.getUTCFullYear(),
      },
      include: {
        employee: {
          select: { id: true, fullName: true, username: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.employee.findMany({
      where: {
        companyId,
        status: "ACTIVE",
        nextSalaryDate: { gte: today, lte: upcomingEnd },
      },
      select: {
        id: true,
        fullName: true,
        username: true,
        monthlySalary: true,
        nextSalaryDate: true,
        department: true,
      },
      orderBy: { nextSalaryDate: "asc" },
    }),
    db.attendance.findMany({
      where: { companyId },
      include: {
        employee: {
          select: { id: true, fullName: true, username: true },
        },
      },
      orderBy: { date: "desc" },
      take: 100,
    }),
    db.leaveRequest.findMany({
      where: { companyId },
      include: {
        employee: {
          select: { id: true, fullName: true, username: true },
        },
        reviewedBy: { select: { fullName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
    db.salaryPayment.findMany({
      where: { companyId },
      include: {
        employee: {
          select: { id: true, fullName: true, username: true },
        },
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      take: 80,
    }),
    runSalaryAlerts(companyId),
  ]);

  const byEmployee = new Map<
    string,
    {
      present: number;
      absent: number;
      late: number;
      leave: number;
      halfDay: number;
    }
  >();

  for (const emp of employees) {
    byEmployee.set(emp.id, {
      present: 0,
      absent: 0,
      late: 0,
      leave: 0,
      halfDay: 0,
    });
  }

  for (const row of attendances) {
    const bucket = byEmployee.get(row.employeeId);
    if (!bucket) continue;
    if (row.status === "PRESENT") bucket.present += 1;
    else if (row.status === "ABSENT") bucket.absent += 1;
    else if (row.status === "LATE") bucket.late += 1;
    else if (row.status === "LEAVE") bucket.leave += 1;
    else if (row.status === "HALF_DAY") bucket.halfDay += 1;
  }

  const attendanceTotals = {
    present: attendances.filter((a) => a.status === "PRESENT").length,
    absent: attendances.filter((a) => a.status === "ABSENT").length,
    late: attendances.filter((a) => a.status === "LATE").length,
    leave: attendances.filter((a) => a.status === "LEAVE").length,
    halfDay: attendances.filter((a) => a.status === "HALF_DAY").length,
  };

  const performance = employees.map((emp) => {
    const stats = byEmployee.get(emp.id)!;
    const total =
      stats.present +
      stats.absent +
      stats.late +
      stats.leave +
      stats.halfDay;
    const weighted =
      stats.present + stats.halfDay * 0.5 + stats.late * 0.75;
    const score = total === 0 ? 0 : Math.round((weighted / total) * 100);

    return {
      id: emp.id,
      fullName: emp.fullName,
      username: emp.username,
      department: emp.department,
      status: emp.status,
      ...stats,
      totalDays: total,
      score,
    };
  });

  const lateEmployees = performance
    .filter((p) => p.late > 0)
    .sort((a, b) => b.late - a.late);

  const absentEmployees = performance
    .filter((p) => p.absent > 0)
    .sort((a, b) => b.absent - a.absent);

  const activeEmployees = employees.filter((e) => e.status === "ACTIVE");
  const inactiveEmployees = employees.filter(
    (e) => e.status === "INACTIVE" || e.status === "SUSPENDED"
  );

  const avgScore =
    performance.length === 0
      ? 0
      : Math.round(
          performance.reduce((sum, p) => sum + p.score, 0) / performance.length
        );

  const salaryPaid = salaries
    .filter((s) => s.status === "PAID")
    .reduce((sum, s) => sum + Number(s.amount), 0);
  const salaryPending = salaries
    .filter((s) => s.status === "PENDING")
    .reduce((sum, s) => sum + Number(s.amount), 0);

  return {
    period: {
      month: now.getUTCMonth() + 1,
      year: now.getUTCFullYear(),
      label: `${now.getUTCMonth() + 1}/${now.getUTCFullYear()}`,
    },
    summary: {
      totalEmployees: employees.length,
      activeEmployees: activeEmployees.length,
      inactiveEmployees: inactiveEmployees.length,
      suspendedEmployees: employees.filter((e) => e.status === "SUSPENDED")
        .length,
      attendance: attendanceTotals,
      leavePending: leaves.filter((l) => l.status === "PENDING").length,
      leaveApproved: leaves.filter((l) => l.status === "APPROVED").length,
      leaveRejected: leaves.filter((l) => l.status === "REJECTED").length,
      salaryPaidThisMonth: salaryPaid,
      salaryPendingThisMonth: salaryPending,
      upcomingSalaryCount: upcomingSalaries.length,
      averagePerformance: avgScore,
      newSalaryAlerts: alertResults.filter((a) => a.created).length,
    },
    attendanceReport: attendances.map((a) => ({
      id: a.id,
      date: dateKey(a.date),
      status: a.status,
      notes: a.notes,
      employee: a.employee,
    })),
    leaveReport: leaves.map((l) => ({
      id: l.id,
      leaveType: l.leaveType,
      reason: l.reason,
      startDate: dateKey(l.startDate),
      endDate: dateKey(l.endDate),
      status: l.status,
      employee: l.employee,
      reviewedBy: l.reviewedBy,
    })),
    salaryReport: salaries.map((s) => ({
      id: s.id,
      amount: Number(s.amount),
      month: s.month,
      year: s.year,
      paymentDate: s.paymentDate ? dateKey(s.paymentDate) : null,
      nextSalaryDate: s.nextSalaryDate ? dateKey(s.nextSalaryDate) : null,
      status: s.status,
      employee: s.employee,
    })),
    activeEmployees: activeEmployees.map(serializeEmployee),
    inactiveEmployees: inactiveEmployees.map(serializeEmployee),
    lateEmployees,
    absentEmployees,
    performance,
    upcomingSalaries: upcomingSalaries.map((e) => ({
      id: e.id,
      fullName: e.fullName,
      username: e.username,
      department: e.department,
      monthlySalary: Number(e.monthlySalary),
      nextSalaryDate: e.nextSalaryDate ? dateKey(e.nextSalaryDate) : null,
    })),
    allAttendance: recentAttendance.map((a) => ({
      id: a.id,
      date: dateKey(a.date),
      status: a.status,
      notes: a.notes,
      employee: a.employee,
    })),
    allLeaves: allLeaves.map((l) => ({
      id: l.id,
      leaveType: l.leaveType,
      reason: l.reason,
      startDate: dateKey(l.startDate),
      endDate: dateKey(l.endDate),
      status: l.status,
      employee: l.employee,
      reviewedBy: l.reviewedBy,
    })),
    salaryHistory: salaryHistory.map((s) => ({
      id: s.id,
      amount: Number(s.amount),
      month: s.month,
      year: s.year,
      paymentDate: s.paymentDate ? dateKey(s.paymentDate) : null,
      nextSalaryDate: s.nextSalaryDate ? dateKey(s.nextSalaryDate) : null,
      status: s.status,
      employee: s.employee,
    })),
    salaryAlerts: alertResults,
  };
}

function serializeEmployee(e: {
  id: string;
  fullName: string;
  username: string;
  photo: string | null;
  phone: string | null;
  department: string | null;
  position: string | null;
  role: string;
  status: string;
  monthlySalary: { toString(): string } | number;
  nextSalaryDate: Date | null;
  dateJoined: Date;
}) {
  return {
    id: e.id,
    fullName: e.fullName,
    username: e.username,
    photo: e.photo,
    phone: e.phone,
    department: e.department,
    position: e.position,
    role: e.role,
    status: e.status,
    monthlySalary: Number(e.monthlySalary),
    nextSalaryDate: e.nextSalaryDate ? dateKey(e.nextSalaryDate) : null,
    dateJoined: dateKey(e.dateJoined),
  };
}

export type EmployeeReportsData = Awaited<
  ReturnType<typeof buildEmployeeReports>
>;
