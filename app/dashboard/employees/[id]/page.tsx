import { notFound } from "next/navigation";
import { db } from "@/lib/prisma/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import EmployeeProfile from "@/components/employees/EmployeeProfile";
import RecordVersionHistorySection from "@/components/versions/RecordVersionHistorySection";
import { tServer } from "@/lib/i18n";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EmployeeDetailsPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) return null;

  const t = tServer.t.bind(tServer);
  const { id } = await params;

  const employee = await db.employee.findFirst({
    where: { id, companyId: user.companyId, deletedAt: null },
    include: {
      createdBy: { select: { id: true, fullName: true } },
      attendances: {
        orderBy: { date: "desc" },
        take: 120,
      },
      leaveRequests: {
        orderBy: { createdAt: "desc" },
        take: 40,
        include: {
          reviewedBy: { select: { fullName: true } },
        },
      },
      salaryPayments: {
        orderBy: [{ year: "desc" }, { month: "desc" }],
        take: 36,
      },
      history: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          actor: { select: { fullName: true } },
        },
      },
    },
  });

  if (!employee) notFound();

  return (
    <>
    <EmployeeProfile
      employee={{
        id: employee.id,
        photo: employee.photo,
        fullName: employee.fullName,
        username: employee.username,
        phone: employee.phone,
        email: employee.email,
        address: employee.address,
        nationalId: employee.nationalId,
        position: employee.position,
        department: employee.department,
        role: employee.role,
        status: employee.status,
        monthlySalary: Number(employee.monthlySalary),
        nextSalaryDate: employee.nextSalaryDate?.toISOString() ?? null,
        dateJoined: employee.dateJoined.toISOString(),
        notes: employee.notes,
        createdBy: employee.createdBy,
        createdAt: employee.createdAt.toISOString(),
      }}
      attendances={employee.attendances.map((a) => ({
        id: a.id,
        date: a.date.toISOString(),
        status: a.status,
        notes: a.notes,
      }))}
      leaves={employee.leaveRequests.map((l) => ({
        id: l.id,
        leaveType: l.leaveType,
        reason: l.reason,
        startDate: l.startDate.toISOString(),
        endDate: l.endDate.toISOString(),
        status: l.status,
        reviewedBy: l.reviewedBy,
      }))}
      salaries={employee.salaryPayments.map((s) => ({
        id: s.id,
        amount: Number(s.amount),
        month: s.month,
        year: s.year,
        paymentDate: s.paymentDate?.toISOString() ?? null,
        nextSalaryDate: s.nextSalaryDate?.toISOString() ?? null,
        status: s.status,
        notes: s.notes,
      }))}
      history={employee.history.map((h) => ({
        id: h.id,
        action: h.action,
        message: h.message,
        createdAt: h.createdAt.toISOString(),
        actor: h.actor,
      }))}
    />
    <RecordVersionHistorySection
      entityType={t("employees.entityType")}
      entityId={employee.id}
      recordLabel={employee.fullName}
    />
    </>
  );
}
