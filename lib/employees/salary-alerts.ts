import { db } from "@/lib/prisma/db";
import { createNotification } from "@/lib/notifications/create";

export const ALERT_WINDOW_DAYS = 5;

export type SalaryAlertResult = {
  employeeId: string;
  fullName: string;
  nextSalaryDate: string;
  daysUntil: number;
  notificationId: string | null;
  created: boolean;
};

function startOfUtcDay(d = new Date()) {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  );
}

function addUtcDays(d: Date, days: number) {
  return new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * Detect employees whose next salary date is overdue or within 5 days.
 * Deduped with a single day's notification prefetch (no N+1).
 */
export async function runSalaryAlerts(
  companyId: string
): Promise<SalaryAlertResult[]> {
  const today = startOfUtcDay();
  const windowEnd = addUtcDays(today, ALERT_WINDOW_DAYS);

  const [employees, existingRows] = await Promise.all([
    db.employee.findMany({
      where: {
        companyId,
        status: "ACTIVE",
        nextSalaryDate: {
          not: null,
          lte: windowEnd,
        },
      },
      select: {
        id: true,
        fullName: true,
        username: true,
        monthlySalary: true,
        nextSalaryDate: true,
      },
    }),
    db.notification.findMany({
      where: {
        companyId,
        entityType: "کارمەند",
        deletedAt: null,
        metadata: {
          path: ["kind"],
          equals: "SALARY_APPROACHING",
        },
      },
      select: { id: true, entityId: true, metadata: true },
    }),
  ]);

  const existingByPeriod = new Map(
    existingRows.filter((r) => r.entityId).map((r) => {
      const metadata = r.metadata as { salaryDate?: string } | null;
      return [`${r.entityId}:${metadata?.salaryDate || ""}`, r.id];
    })
  );

  const results: SalaryAlertResult[] = [];

  for (const employee of employees) {
    if (!employee.nextSalaryDate) continue;

    const next = startOfUtcDay(employee.nextSalaryDate);
    const daysUntil = Math.round(
      (next.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)
    );
    const salaryKey = next.toISOString().slice(0, 10);
    const existingId = existingByPeriod.get(`${employee.id}:${salaryKey}`);

    if (existingId) {
      results.push({
        employeeId: employee.id,
        fullName: employee.fullName,
        nextSalaryDate: salaryKey,
        daysUntil,
        notificationId: existingId,
        created: false,
      });
      continue;
    }

    const overdue = daysUntil < 0;
    const title = overdue ? "مووچە دواکەوتووە" : "مووچە نزیکە";
    const message = overdue
      ? `مووچەی ${employee.fullName} ${Math.abs(daysUntil)} ڕۆژ دواکەوتووە (${salaryKey}).`
      : daysUntil === 0
        ? `ئەمڕۆ مووچەی ${employee.fullName} دەبێت بدرێت.`
        : `مووچەی ${employee.fullName} دوای ${daysUntil} ڕۆژ دێت (${salaryKey}).`;

    const notification = await createNotification({
      companyId,
      title,
      message,
      category: "EMPLOYEE",
      priority: overdue || daysUntil <= 2 ? "HIGH" : "NORMAL",
      href: `/dashboard/employees/${employee.id}`,
      entityType: "کارمەند",
      entityId: employee.id,
      metadata: {
        kind: "SALARY_APPROACHING",
        salaryDate: salaryKey,
        daysUntil,
        monthlySalary: Number(employee.monthlySalary),
      },
    });

    results.push({
      employeeId: employee.id,
      fullName: employee.fullName,
      nextSalaryDate: salaryKey,
      daysUntil,
      notificationId: notification?.id ?? null,
      created: Boolean(notification),
    });
  }

  return results;
}
