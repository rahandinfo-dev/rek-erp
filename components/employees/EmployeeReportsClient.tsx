"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  Clock3,
  IdCard,
  TrendingUp,
  UserMinus,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import type { EmployeeReportsData } from "@/lib/employees/reports";
import { formatMoney } from "@/lib/utils/format";
import { appToast } from "@/lib/toast";
import SalaryAlertsWatcher from "@/components/employees/SalaryAlertsWatcher";
import { useT } from "@/components/i18n/LocaleProvider";

type SectionId =
  | "overview"
  | "attendance"
  | "leave"
  | "salary"
  | "active"
  | "inactive"
  | "late"
  | "absent"
  | "performance"
  | "manager";

const SECTION_IDS: SectionId[] = [
  "overview",
  "attendance",
  "leave",
  "salary",
  "active",
  "inactive",
  "late",
  "absent",
  "performance",
  "manager",
];

export default function EmployeeReportsClient({
  data,
}: {
  data: EmployeeReportsData;
}) {
  const { t } = useT();
  const [section, setSection] = useState<SectionId>("overview");
  const toasted = useMemo(
    () => data.salaryAlerts.filter((a) => a.created),
    [data.salaryAlerts]
  );

  useEffect(() => {
    if (toasted.length === 0) return;
    if (toasted.length === 1) {
      const a = toasted[0];
      appToast.salaryAlert(
        a.daysUntil < 0
          ? t("employees.salaryOverdueBody", {
              name: a.fullName,
              days: Math.abs(a.daysUntil),
            })
          : t("employees.salarySoonBody", {
              name: a.fullName,
              date: a.nextSalaryDate,
            }),
        a.daysUntil < 0
          ? t("employees.salaryOverdueTitle")
          : t("employees.salarySoonTitle")
      );
      return;
    }
    appToast.salaryAlert(
      t("employees.salaryAlertsCreated", { count: toasted.length }),
      t("toast.salaryAlertTitle")
    );
  }, [toasted, t]);

  const s = data.summary;

  const sections = SECTION_IDS.map((id) => ({
    id,
    label: t(
      id === "overview"
        ? "employees.sectionOverview"
        : id === "attendance"
          ? "employees.sectionAttendance"
          : id === "leave"
            ? "employees.sectionLeave"
            : id === "salary"
              ? "employees.sectionSalary"
              : id === "active"
                ? "employees.sectionActive"
                : id === "inactive"
                  ? "employees.sectionInactive"
                  : id === "late"
                    ? "employees.sectionLate"
                    : id === "absent"
                      ? "employees.sectionAbsent"
                      : id === "performance"
                        ? "employees.sectionPerformance"
                        : "employees.sectionManager"
    ),
  }));

  return (
    <div className="space-y-6 sm:space-y-8">
      <SalaryAlertsWatcher toast={toasted.length === 0} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-2xl bg-[#FFF8EF] px-3 py-1 text-sm font-bold text-[#FFAE42]">
            <IdCard size={16} />
            {t("employees.reportsBadge", { period: data.period.label })}
          </div>
          <h1 className="text-3xl font-black text-[#FFAE42] sm:text-4xl">
            {t("employees.reportsTitle")}
          </h1>
          <p className="mt-2 text-slate-500">
            {t("employees.reportsDescription")}
          </p>
        </div>
        <Link
          href="/dashboard/employees"
          className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-600 transition hover:border-[#FFAE42]/30 hover:text-[#FFAE42]"
        >
          {t("employees.listLink")}
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-4">
        <Kpi
          icon={Users}
          label={t("employees.kpiEmployee")}
          value={String(s.totalEmployees)}
          sub={t("employees.kpiActiveSub", { count: s.activeEmployees })}
        />
        <Kpi
          icon={CalendarDays}
          label={t("employees.kpiAttendance")}
          value={String(s.attendance.present)}
          sub={t("employees.kpiAttSub", {
            late: s.attendance.late,
            absent: s.attendance.absent,
          })}
        />
        <Kpi
          icon={Wallet}
          label={t("employees.kpiSalaryMonth")}
          value={`${formatMoney(s.salaryPaidThisMonth)}`}
          sub={t("employees.kpiUpcomingSub", { count: s.upcomingSalaryCount })}
        />
        <Kpi
          icon={TrendingUp}
          label={t("employees.kpiAvgPerf")}
          value={`${s.averagePerformance}%`}
          sub={t("employees.kpiAlertsSub", { count: s.newSalaryAlerts })}
        />
      </div>

      {data.upcomingSalaries.length > 0 && (
        <section className="rounded-[1.75rem] border border-amber-200 bg-amber-50/80 p-5">
          <div className="mb-3 flex items-center gap-2 font-black text-amber-900">
            <AlertTriangle size={18} />
            {t("employees.upcomingSalaries")}
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {data.upcomingSalaries.map((e) => (
              <Link
                key={e.id}
                href={`/dashboard/employees/${e.id}`}
                className="rounded-2xl bg-white px-4 py-3 shadow-sm transition hover:shadow-md"
              >
                <p className="font-bold text-slate-800">{e.fullName}</p>
                <p className="text-xs text-slate-500">
                  {e.nextSalaryDate} · {formatMoney(e.monthlySalary)}{" "}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="rek-tabs-scroll">
        <div className="inline-flex min-w-full gap-2 rounded-[1.5rem] border border-[rgba(255, 174, 66,0.08)] bg-white p-2 shadow-sm">
          {sections.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
              className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                section === item.id
                  ? "bg-[#FFAE42] text-white shadow-md shadow-[#FFAE42]/25"
                  : "text-slate-500 hover:bg-[#FFF8EF] hover:text-[#FFAE42]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <section className="rounded-[2rem] border border-[rgba(255, 174, 66,0.08)] bg-white p-5 shadow-sm sm:p-8">
        {section === "overview" && (
          <div className="space-y-6">
            <h2 className="text-xl font-black text-[#FFAE42]">
              {t("employees.overviewTitle")}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Mini
                label={t("employees.miniActive")}
                value={s.activeEmployees}
                icon={UserPlus}
              />
              <Mini
                label={t("employees.miniInactive")}
                value={s.inactiveEmployees}
                icon={UserMinus}
              />
              <Mini
                label={t("employees.miniLeavePending")}
                value={s.leavePending}
                icon={Clock3}
              />
              <Mini
                label={t("employees.miniSalaryPending")}
                value={formatMoney(s.salaryPendingThisMonth)}
                icon={Wallet}
              />
            </div>
            <p className="text-sm text-slate-500">
              {t("employees.monthSummary", {
                present: s.attendance.present,
                late: s.attendance.late,
                absent: s.attendance.absent,
                leave: s.attendance.leave,
                halfDay: s.attendance.halfDay,
              })}
            </p>
          </div>
        )}

        {section === "attendance" && (
          <ReportTable
            title={t("employees.attendanceReportTitle")}
            empty={t("employees.attendanceReportEmpty")}
            rows={data.attendanceReport.map((r) => [
              r.employee.fullName,
              r.date,
              t(`employees.attendance.${r.status}`) || r.status,
              r.notes || t("common.emDash"),
            ])}
            headers={[
              t("employees.colEmployee"),
              t("employees.colDate"),
              t("employees.colStatus"),
              t("employees.colNotes"),
            ]}
          />
        )}

        {section === "leave" && (
          <ReportTable
            title={t("employees.leaveReportTitle")}
            empty={t("employees.leaveReportEmpty")}
            rows={data.leaveReport.map((r) => [
              r.employee.fullName,
              t(`employees.leaveTypes.${r.leaveType}`) || r.leaveType,
              `${r.startDate} → ${r.endDate}`,
              t(`employees.leaveStatuses.${r.status}`) || r.status,
            ])}
            headers={[
              t("employees.colEmployee"),
              t("employees.colType"),
              t("employees.colPeriod"),
              t("employees.colStatus"),
            ]}
          />
        )}

        {section === "salary" && (
          <div className="space-y-8">
            <ReportTable
              title={t("employees.salaryReportTitle")}
              empty={t("employees.salaryReportEmpty")}
              rows={data.salaryReport.map((r) => [
                r.employee.fullName,
                `${formatMoney(r.amount)}`,
                `${r.month}/${r.year}`,
                r.paymentDate || t("common.emDash"),
                t(`employees.salaryStatuses.${r.status}`) || r.status,
              ])}
              headers={[
                t("employees.colEmployee"),
                t("employees.colAmount"),
                t("employees.colMonth"),
                t("employees.colPayment"),
                t("employees.colStatus"),
              ]}
            />
            <ReportTable
              title={t("employees.salaryHistoryTitle")}
              empty={t("employees.salaryHistoryEmptyShort")}
              rows={data.salaryHistory.map((r) => [
                r.employee.fullName,
                `${formatMoney(r.amount)}`,
                `${r.month}/${r.year}`,
                r.nextSalaryDate || t("common.emDash"),
                t(`employees.salaryStatuses.${r.status}`) || r.status,
              ])}
              headers={[
                t("employees.colEmployee"),
                t("employees.colAmount"),
                t("employees.colMonth"),
                t("employees.colNext"),
                t("employees.colStatus"),
              ]}
            />
          </div>
        )}

        {section === "active" && (
          <EmployeeList
            title={t("employees.activeListTitle")}
            items={data.activeEmployees}
          />
        )}

        {section === "inactive" && (
          <EmployeeList
            title={t("employees.inactiveListTitle")}
            items={data.inactiveEmployees}
          />
        )}

        {section === "late" && (
          <ReportTable
            title={t("employees.lateReportTitle")}
            empty={t("employees.lateReportEmpty")}
            rows={data.lateEmployees.map((r) => [
              r.fullName,
              String(r.late),
              String(r.present),
              `${r.score}%`,
            ])}
            headers={[
              t("employees.colEmployee"),
              t("employees.colLate"),
              t("employees.colPresent"),
              t("employees.colPerf"),
            ]}
            links={data.lateEmployees.map((r) => r.id)}
          />
        )}

        {section === "absent" && (
          <ReportTable
            title={t("employees.absentReportTitle")}
            empty={t("employees.absentReportEmpty")}
            rows={data.absentEmployees.map((r) => [
              r.fullName,
              String(r.absent),
              String(r.present),
              `${r.score}%`,
            ])}
            headers={[
              t("employees.colEmployee"),
              t("employees.colAbsent"),
              t("employees.colPresent"),
              t("employees.colPerf"),
            ]}
            links={data.absentEmployees.map((r) => r.id)}
          />
        )}

        {section === "performance" && (
          <ReportTable
            title={t("employees.performanceTitle")}
            empty={t("employees.performanceEmpty")}
            rows={[...data.performance]
              .sort((a, b) => b.score - a.score)
              .map((r) => [
                r.fullName,
                String(r.present),
                String(r.late),
                String(r.absent),
                `${r.score}%`,
              ])}
            headers={[
              t("employees.colEmployee"),
              t("employees.colPresent"),
              t("employees.colLateShort"),
              t("employees.colAbsent"),
              t("employees.colPerf"),
            ]}
            links={[...data.performance]
              .sort((a, b) => b.score - a.score)
              .map((r) => r.id)}
          />
        )}

        {section === "manager" && (
          <div className="space-y-8">
            <h2 className="text-xl font-black text-[#FFAE42]">
              {t("employees.managerTitle")}
            </h2>
            <ReportTable
              title={t("employees.allAttendanceTitle")}
              empty={t("common.emDash")}
              rows={data.allAttendance.map((r) => [
                r.employee.fullName,
                r.date,
                t(`employees.attendance.${r.status}`) || r.status,
              ])}
              headers={[
                t("employees.colEmployee"),
                t("employees.colDate"),
                t("employees.colStatus"),
              ]}
            />
            <ReportTable
              title={t("employees.allLeavesTitle")}
              empty={t("common.emDash")}
              rows={data.allLeaves.map((r) => [
                r.employee.fullName,
                t(`employees.leaveTypes.${r.leaveType}`) || r.leaveType,
                `${r.startDate} → ${r.endDate}`,
                t(`employees.leaveStatuses.${r.status}`) || r.status,
              ])}
              headers={[
                t("employees.colEmployee"),
                t("employees.colType"),
                t("employees.colPeriod"),
                t("employees.colStatus"),
              ]}
            />
            <ReportTable
              title={t("employees.upcomingSalariesTitle")}
              empty={t("employees.upcomingSalariesEmpty")}
              rows={data.upcomingSalaries.map((r) => [
                r.fullName,
                r.nextSalaryDate || t("common.emDash"),
                `${formatMoney(r.monthlySalary)}`,
                r.department || t("common.emDash"),
              ])}
              headers={[
                t("employees.colEmployee"),
                t("employees.colDate"),
                t("employees.colAmount"),
                t("employees.colDepartment"),
              ]}
              links={data.upcomingSalaries.map((r) => r.id)}
            />
          </div>
        )}
      </section>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-[rgba(255, 174, 66,0.08)] bg-white p-4 shadow-sm">
      <div className="mb-3 inline-flex rounded-2xl bg-[#FFF8EF] p-2.5 text-[#FFAE42]">
        <Icon size={18} />
      </div>
      <p className="text-xs font-semibold text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-black text-[#FFAE42]">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{sub}</p>
    </div>
  );
}

function Mini({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: typeof Users;
}) {
  return (
    <div className="rounded-2xl bg-[#FFF8EF]/60 px-4 py-3">
      <div className="flex items-center gap-2 text-[#FFAE42]">
        <Icon size={16} />
        <span className="text-xs font-bold">{label}</span>
      </div>
      <p className="mt-2 text-lg font-black text-slate-800">{value}</p>
    </div>
  );
}

function ReportTable({
  title,
  headers,
  rows,
  empty,
  links,
}: {
  title: string;
  headers: string[];
  rows: string[][];
  empty: string;
  links?: string[];
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-black text-[#FFAE42]">{title}</h2>
      {rows.length === 0 ? (
        <p className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-slate-500">
          {empty}
        </p>
      ) : (
        <div className="rek-table-shell">
          <div className="rek-table-wrap">
          <table className="min-w-[480px] w-full text-sm sm:min-w-full">
            <thead className="bg-[#FFF8EF]/70 text-[#FFAE42]">
              <tr>
                {headers.map((h) => (
                  <th key={h} className="px-4 py-3 text-right font-bold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={`${title}-${i}`}
                  className="border-t border-slate-100 hover:bg-slate-50/80"
                >
                  {row.map((cell, j) => (
                    <td key={j} className="max-w-[14rem] truncate px-4 py-3 font-medium text-slate-700">
                      {j === 0 && links?.[i] ? (
                        <Link
                          href={`/dashboard/employees/${links[i]}`}
                          className="font-bold text-[#FFAE42] hover:underline"
                        >
                          {cell}
                        </Link>
                      ) : (
                        cell
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}

function EmployeeList({
  title,
  items,
}: {
  title: string;
  items: Array<{
    id: string;
    fullName: string;
    username: string;
    department: string | null;
    position: string | null;
    status: string;
    monthlySalary: number;
  }>;
}) {
  const { t } = useT();
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-black text-[#FFAE42]">{title}</h2>
      {items.length === 0 ? (
        <p className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-slate-500">
          {t("employees.listEmpty")}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((e) => (
            <Link
              key={e.id}
              href={`/dashboard/employees/${e.id}`}
              className="rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-4 transition hover:border-[#FFAE42]/25 hover:bg-white hover:shadow-sm"
            >
              <p className="font-black text-slate-800">{e.fullName}</p>
              <p className="text-xs text-slate-500">
                @{e.username}
                {e.position ? ` · ${e.position}` : ""}
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold">
                <span className="rounded-full bg-white px-2 py-1 text-[#FFAE42]">
                  {t(`employees.statuses.${e.status}`) || e.status}
                </span>
                <span className="rounded-full bg-white px-2 py-1 text-slate-600">
                  {formatMoney(e.monthlySalary)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
