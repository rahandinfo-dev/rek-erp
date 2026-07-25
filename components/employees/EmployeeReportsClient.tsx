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
import {
  ATTENDANCE_STATUS_LABELS,
  EMPLOYEE_STATUS_LABELS,
  LEAVE_STATUS_LABELS,
  LEAVE_TYPE_LABELS,
  SALARY_STATUS_LABELS,
} from "@/lib/employees/labels";
import { formatMoney } from "@/lib/utils/format";
import { appToast } from "@/lib/toast";
import SalaryAlertsWatcher from "@/components/employees/SalaryAlertsWatcher";

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

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "overview", label: "گشتی" },
  { id: "attendance", label: "ئامادەبوون" },
  { id: "leave", label: "مۆڵەت" },
  { id: "salary", label: "مووچە" },
  { id: "active", label: "چالاک" },
  { id: "inactive", label: "ناچالاک" },
  { id: "late", label: "دواکەوتوو" },
  { id: "absent", label: "غائیب" },
  { id: "performance", label: "ئەدای کار" },
  { id: "manager", label: "بەڕێوەبەر" },
];

export default function EmployeeReportsClient({
  data,
}: {
  data: EmployeeReportsData;
}) {
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
          ? `${a.fullName} · ${Math.abs(a.daysUntil)} ڕۆژ دواکەوتوو`
          : `${a.fullName} · ${a.nextSalaryDate}`,
        a.daysUntil < 0 ? "مووچە دواکەوتووە" : "مووچە نزیکە"
      );
      return;
    }
    appToast.salaryAlert(
      `${toasted.length} ئاگاداری مووچەی نوێ دروستکرا.`,
      "ئاگاداری مووچە"
    );
  }, [toasted]);

  const s = data.summary;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Avoid double toast from watcher when alerts already created on SSR */}
      <SalaryAlertsWatcher toast={toasted.length === 0} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-2xl bg-[#FFF8EF] px-3 py-1 text-sm font-bold text-[#FFAE42]">
            <IdCard size={16} />
            ڕاپۆرتی کارمەندان · {data.period.label}
          </div>
          <h1 className="text-3xl font-black text-[#FFAE42] sm:text-4xl">
            ڕاپۆرتی کارمەندان
          </h1>
          <p className="mt-2 text-slate-500">
            ئامادەبوون، مۆڵەت، مووچە، ئەدا و ئاگادارییەکان — هەموو کۆمپانیا.
          </p>
        </div>
        <Link
          href="/dashboard/employees"
          className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-600 transition hover:border-[#FFAE42]/30 hover:text-[#FFAE42]"
        >
          لیستی کارمەندان
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-4">
        <Kpi
          icon={Users}
          label="کارمەند"
          value={String(s.totalEmployees)}
          sub={`${s.activeEmployees} چالاک`}
        />
        <Kpi
          icon={CalendarDays}
          label="ئامادەبوون"
          value={String(s.attendance.present)}
          sub={`${s.attendance.late} دوا · ${s.attendance.absent} غائیب`}
        />
        <Kpi
          icon={Wallet}
          label="مووچەی مانگ"
          value={`${formatMoney(s.salaryPaidThisMonth)}`}
          sub={`${s.upcomingSalaryCount} نزیکە`}
        />
        <Kpi
          icon={TrendingUp}
          label="ناوەندی ئەدا"
          value={`${s.averagePerformance}%`}
          sub={`${s.newSalaryAlerts} ئاگاداری نوێ`}
        />
      </div>

      {data.upcomingSalaries.length > 0 && (
        <section className="rounded-[1.75rem] border border-amber-200 bg-amber-50/80 p-5">
          <div className="mb-3 flex items-center gap-2 font-black text-amber-900">
            <AlertTriangle size={18} />
            مووچەکانی نزیک / چاوەڕوان
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
                  {e.nextSalaryDate} · {formatMoney(e.monthlySalary)} IQD
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="rek-tabs-scroll">
        <div className="inline-flex min-w-full gap-2 rounded-[1.5rem] border border-[rgba(255, 174, 66,0.08)] bg-white p-2 shadow-sm">
          {SECTIONS.map((item) => (
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
            <h2 className="text-xl font-black text-[#FFAE42]">کورتەی گشتی</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Mini
                label="چالاک"
                value={s.activeEmployees}
                icon={UserPlus}
              />
              <Mini
                label="ناچالاک / ڕاگیراو"
                value={s.inactiveEmployees}
                icon={UserMinus}
              />
              <Mini
                label="مۆڵەتی چاوەڕوان"
                value={s.leavePending}
                icon={Clock3}
              />
              <Mini
                label="مووچەی چاوەڕوان"
                value={formatMoney(s.salaryPendingThisMonth)}
                icon={Wallet}
              />
            </div>
            <p className="text-sm text-slate-500">
              ئەم مانگە: {s.attendance.present} ئامادە · {s.attendance.late}{" "}
              دواکەوتوو · {s.attendance.absent} غائیب · {s.attendance.leave}{" "}
              مۆڵەت · {s.attendance.halfDay} نیوەڕۆژ.
            </p>
          </div>
        )}

        {section === "attendance" && (
          <ReportTable
            title="ڕاپۆرتی ئامادەبوون (ئەم مانگە)"
            empty="هیچ تۆماری ئامادەبوون نییە."
            rows={data.attendanceReport.map((r) => [
              r.employee.fullName,
              r.date,
              ATTENDANCE_STATUS_LABELS[r.status] || r.status,
              r.notes || "—",
            ])}
            headers={["کارمەند", "بەروار", "دۆخ", "تێبینی"]}
          />
        )}

        {section === "leave" && (
          <ReportTable
            title="ڕاپۆرتی مۆڵەت (ئەم مانگە)"
            empty="هیچ داواکاری مۆڵەت نییە."
            rows={data.leaveReport.map((r) => [
              r.employee.fullName,
              LEAVE_TYPE_LABELS[r.leaveType] || r.leaveType,
              `${r.startDate} → ${r.endDate}`,
              LEAVE_STATUS_LABELS[r.status] || r.status,
            ])}
            headers={["کارمەند", "جۆر", "ماوە", "دۆخ"]}
          />
        )}

        {section === "salary" && (
          <div className="space-y-8">
            <ReportTable
              title="ڕاپۆرتی مووچەی ئەم مانگە"
              empty="هیچ مووچەیەک تۆمار نەکراوە."
              rows={data.salaryReport.map((r) => [
                r.employee.fullName,
                `${formatMoney(r.amount)} IQD`,
                `${r.month}/${r.year}`,
                r.paymentDate || "—",
                SALARY_STATUS_LABELS[r.status] || r.status,
              ])}
              headers={["کارمەند", "بڕ", "مانگ", "پارەدان", "دۆخ"]}
            />
            <ReportTable
              title="مێژووی مووچە (کۆمپانیا)"
              empty="مێژوو بەتاڵە."
              rows={data.salaryHistory.map((r) => [
                r.employee.fullName,
                `${formatMoney(r.amount)} IQD`,
                `${r.month}/${r.year}`,
                r.nextSalaryDate || "—",
                SALARY_STATUS_LABELS[r.status] || r.status,
              ])}
              headers={["کارمەند", "بڕ", "مانگ", "داهاتوو", "دۆخ"]}
            />
          </div>
        )}

        {section === "active" && (
          <EmployeeList
            title="کارمەندانی چالاک"
            items={data.activeEmployees}
          />
        )}

        {section === "inactive" && (
          <EmployeeList
            title="کارمەندانی ناچالاک / ڕاگیراو"
            items={data.inactiveEmployees}
          />
        )}

        {section === "late" && (
          <ReportTable
            title="کارمەندانی دواکەوتوو (ئەم مانگە)"
            empty="هیچ دواکەوتنێک نییە."
            rows={data.lateEmployees.map((r) => [
              r.fullName,
              String(r.late),
              String(r.present),
              `${r.score}%`,
            ])}
            headers={["کارمەند", "دواکەوتن", "ئامادە", "ئەدا"]}
            links={data.lateEmployees.map((r) => r.id)}
          />
        )}

        {section === "absent" && (
          <ReportTable
            title="کارمەندانی غائیب (ئەم مانگە)"
            empty="هیچ غەیبەتێک نییە."
            rows={data.absentEmployees.map((r) => [
              r.fullName,
              String(r.absent),
              String(r.present),
              `${r.score}%`,
            ])}
            headers={["کارمەند", "غائیب", "ئامادە", "ئەدا"]}
            links={data.absentEmployees.map((r) => r.id)}
          />
        )}

        {section === "performance" && (
          <ReportTable
            title="کورتەی ئەدای کار"
            empty="داتای ئەدا بەردەست نییە."
            rows={[...data.performance]
              .sort((a, b) => b.score - a.score)
              .map((r) => [
                r.fullName,
                String(r.present),
                String(r.late),
                String(r.absent),
                `${r.score}%`,
              ])}
            headers={["کارمەند", "ئامادە", "دوا", "غائیب", "ئەدا"]}
            links={[...data.performance]
              .sort((a, b) => b.score - a.score)
              .map((r) => r.id)}
          />
        )}

        {section === "manager" && (
          <div className="space-y-8">
            <h2 className="text-xl font-black text-[#FFAE42]">
              بینینی بەڕێوەبەر — هەموو داتا
            </h2>
            <ReportTable
              title="هەموو ئامادەبوون (دوایین ١٠٠)"
              empty="—"
              rows={data.allAttendance.map((r) => [
                r.employee.fullName,
                r.date,
                ATTENDANCE_STATUS_LABELS[r.status] || r.status,
              ])}
              headers={["کارمەند", "بەروار", "دۆخ"]}
            />
            <ReportTable
              title="هەموو داواکاری مۆڵەت"
              empty="—"
              rows={data.allLeaves.map((r) => [
                r.employee.fullName,
                LEAVE_TYPE_LABELS[r.leaveType] || r.leaveType,
                `${r.startDate} → ${r.endDate}`,
                LEAVE_STATUS_LABELS[r.status] || r.status,
              ])}
              headers={["کارمەند", "جۆر", "ماوە", "دۆخ"]}
            />
            <ReportTable
              title="مووچەکانی نزیک"
              empty="هیچ مووچەیەکی نزیک نییە."
              rows={data.upcomingSalaries.map((r) => [
                r.fullName,
                r.nextSalaryDate || "—",
                `${formatMoney(r.monthlySalary)} IQD`,
                r.department || "—",
              ])}
              headers={["کارمەند", "بەروار", "بڕ", "بەش"]}
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
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-black text-[#FFAE42]">{title}</h2>
      {items.length === 0 ? (
        <p className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-slate-500">
          لیست بەتاڵە.
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
                  {EMPLOYEE_STATUS_LABELS[e.status] || e.status}
                </span>
                <span className="rounded-full bg-white px-2 py-1 text-slate-600">
                  {formatMoney(e.monthlySalary)} IQD
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
