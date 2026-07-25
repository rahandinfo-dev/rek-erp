"use client";
import { formatDateTime, toDateInputValue } from "@/lib/utils/datetime";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  History,
  ImagePlus,
  Pencil,
  Save,
  ShieldOff,
  Trash2,
  UserCheck,
  Wallet,
} from "lucide-react";
import AttendanceCalendar from "@/components/employees/AttendanceCalendar";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { appToast } from "@/lib/toast";
import { formatMoney } from "@/lib/utils/format";
import {
  attendanceStatuses,
  employeeRoles,
  leaveTypes,
  salaryStatuses,
  type EmployeeFormValues,
} from "@/lib/validators/employee";
import {
  ATTENDANCE_STATUS_LABELS,
  EMPLOYEE_ROLE_LABELS,
  EMPLOYEE_STATUS_LABELS,
  LEAVE_STATUS_LABELS,
  LEAVE_TYPE_LABELS,
  SALARY_STATUS_LABELS,
} from "@/lib/employees/labels";
import { useFormDraft } from "@/lib/hooks/useFormDraft";
import { DRAFT_KEYS } from "@/lib/drafts/types";
import { AutoSaveBar, AutoSaveStatus } from "@/components/ui/AutoSaveStatus";

type TabId = "profile" | "attendance" | "leave" | "salary" | "history";

type EmployeeData = {
  id: string;
  photo: string | null;
  fullName: string;
  username: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  nationalId: string | null;
  position: string | null;
  department: string | null;
  role: string;
  status: string;
  monthlySalary: number;
  nextSalaryDate: string | null;
  dateJoined: string;
  notes: string | null;
  createdBy: { id: string; fullName: string } | null;
  createdAt: string;
};

type AttendanceItem = {
  id: string;
  date: string;
  status: string;
  notes: string | null;
};

type LeaveItem = {
  id: string;
  leaveType: string;
  reason: string | null;
  startDate: string;
  endDate: string;
  status: string;
  reviewedBy: { fullName: string } | null;
};

type SalaryItem = {
  id: string;
  amount: number;
  month: number;
  year: number;
  paymentDate: string | null;
  nextSalaryDate: string | null;
  status: string;
  notes: string | null;
};

type HistoryItem = {
  id: string;
  action: string;
  message: string;
  createdAt: string;
  actor: { fullName: string } | null;
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-[#FFAE42] focus:bg-white";

function toInputDate(value?: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

export default function EmployeeProfile({
  employee: initial,
  attendances: initialAttendance,
  leaves: initialLeaves,
  salaries: initialSalaries,
  history: initialHistory,
}: {
  employee: EmployeeData;
  attendances: AttendanceItem[];
  leaves: LeaveItem[];
  salaries: SalaryItem[];
  history: HistoryItem[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [tab, setTab] = useState<TabId>("profile");
  const [employee, setEmployee] = useState(initial);
  const [attendances, setAttendances] = useState(initialAttendance);
  const [leaves, setLeaves] = useState(initialLeaves);
  const [salaries, setSalaries] = useState(initialSalaries);
  const [history, setHistory] = useState(initialHistory);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState(
    toDateInputValue(now)
  );
  const [attStatus, setAttStatus] =
    useState<(typeof attendanceStatuses)[number]>("PRESENT");
  const [attNotes, setAttNotes] = useState("");
  const [attBusy, setAttBusy] = useState(false);

  const [leaveType, setLeaveType] =
    useState<(typeof leaveTypes)[number]>("ANNUAL");
  const [leaveReason, setLeaveReason] = useState("");
  const [leaveStart, setLeaveStart] = useState(toDateInputValue(now));
  const [leaveEnd, setLeaveEnd] = useState(toDateInputValue(now));
  const [leaveBusy, setLeaveBusy] = useState(false);

  const [salaryAmount, setSalaryAmount] = useState(employee.monthlySalary || 0);
  const [salaryMonth, setSalaryMonth] = useState(now.getMonth() + 1);
  const [salaryYear, setSalaryYear] = useState(now.getFullYear());
  const [salaryPaymentDate, setSalaryPaymentDate] = useState(
    toDateInputValue(now)
  );
  const [salaryNextDate, setSalaryNextDate] = useState(
    toInputDate(employee.nextSalaryDate)
  );
  const [salaryStatus, setSalaryStatus] =
    useState<(typeof salaryStatuses)[number]>("PAID");
  const [salaryNotes, setSalaryNotes] = useState("");
  const [salaryBusy, setSalaryBusy] = useState(false);

  const [form, setForm] = useState<EmployeeFormValues>({
    photo: employee.photo || "",
    fullName: employee.fullName,
    username: employee.username,
    phone: employee.phone || "",
    email: employee.email || "",
    address: employee.address || "",
    nationalId: employee.nationalId || "",
    position: employee.position || "",
    department: employee.department || "",
    role: employee.role as EmployeeFormValues["role"],
    status: employee.status as EmployeeFormValues["status"],
    monthlySalary: employee.monthlySalary,
    nextSalaryDate: toInputDate(employee.nextSalaryDate),
    dateJoined: toInputDate(employee.dateJoined),
    notes: employee.notes || "",
  });

  const {
    status: draftStatus,
    savedAt: draftSavedAt,
    hasPendingDraft,
    pendingDraft,
    restoreDraft,
    discardDraft,
    clearDraft,
  } = useFormDraft({
    key: `${DRAFT_KEYS.employeeEdit}:${employee.id}`,
    value: form,
    isEmpty: () => false,
  });

  const monthAttendances = useMemo(
    () =>
      attendances.filter((a) => {
        const d = a.date.slice(0, 10);
        return (
          d.startsWith(
            `${calYear}-${String(calMonth).padStart(2, "0")}`
          )
        );
      }),
    [attendances, calYear, calMonth]
  );

  function updateForm<K extends keyof EmployeeFormValues>(
    key: K,
    value: EmployeeFormValues[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function uploadPhoto(file: File) {
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("kind", "employee");
      const res = await fetch("/api/uploads", { method: "POST", body });
      const data = await res.json();
      if (!data.success || !data.data?.url) {
        appToast.error(data.message || "بارکردنی وێنە سەرنەکەوت.");
        return;
      }
      updateForm("photo", data.data.url);
      appToast.success("وێنە بارکرا", "پاشەکەوت بکە بۆ جێگیرکردن.");
    } catch {
      appToast.error("بارکردنی وێنە سەرنەکەوت.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/employees/${employee.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          email: form.email || null,
          photo: form.photo || null,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        appToast.error(data.message || "هەڵەیەک ڕوویدا.");
        return;
      }
      const p = data.data;
      setEmployee({
        ...employee,
        photo: p.photo,
        fullName: p.fullName,
        username: p.username,
        phone: p.phone,
        email: p.email,
        address: p.address,
        nationalId: p.nationalId,
        position: p.position,
        department: p.department,
        role: p.role,
        status: p.status,
        monthlySalary: Number(p.monthlySalary),
        nextSalaryDate: p.nextSalaryDate,
        dateJoined: p.dateJoined,
        notes: p.notes,
      });
      setEditing(false);
      clearDraft();
      appToast.success("پاشەکەوتکرا", "زانیاری کارمەند نوێکرایەوە.");
      startTransition(() => router.refresh());
    } catch {
      appToast.error("هەڵەیەک ڕوویدا.");
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(status: "ACTIVE" | "INACTIVE" | "SUSPENDED") {
    try {
      const res = await fetch(`/api/employees/${employee.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!data.success) {
        appToast.error(data.message || "هەڵەیەک ڕوویدا.");
        return;
      }
      setEmployee((e) => ({ ...e, status }));
      updateForm("status", status);
      setHistory((h) => [
        {
          id: `local-${Date.now()}`,
          action: status,
          message: `دۆخ بوو بە ${EMPLOYEE_STATUS_LABELS[status]}.`,
          createdAt: new Date().toISOString(),
          actor: null,
        },
        ...h,
      ]);
      appToast.success("دۆخ نوێکرایەوە", EMPLOYEE_STATUS_LABELS[status]);
      startTransition(() => router.refresh());
    } catch {
      appToast.error("هەڵەیەک ڕوویدا.");
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const { softDeleteWithUndo } = await import("@/lib/delete/withUndo");
      const result = await softDeleteWithUndo({
        deleteUrl: `/api/employees/${employee.id}`,
        restoreUrl: `/api/employees/${employee.id}/restore`,
        module: "employees",
        title: "Employee archived",
        message: employee.fullName,
        entityType: "Employee",
        entityId: employee.id,
        onSoftDeleted: () => {
          setConfirmDelete(false);
          router.push("/dashboard/employees");
          router.refresh();
        },
        onRestored: () => {
          router.push(`/dashboard/employees/${employee.id}`);
          router.refresh();
        },
      });
      if (!result.ok) return;
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  async function saveAttendance() {
    setAttBusy(true);
    try {
      const res = await fetch(`/api/employees/${employee.id}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          status: attStatus,
          notes: attNotes || null,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        appToast.error(data.message || "هەڵەیەک ڕوویدا.");
        return;
      }
      const item = {
        id: data.data.id,
        date: data.data.date,
        status: data.data.status,
        notes: data.data.notes,
      };
      setAttendances((prev) => {
        const filtered = prev.filter(
          (a) => a.date.slice(0, 10) !== selectedDate
        );
        return [item, ...filtered];
      });
      appToast.success("ئامادەبوون پاشەکەوتکرا");
    } catch {
      appToast.error("هەڵەیەک ڕوویدا.");
    } finally {
      setAttBusy(false);
    }
  }

  async function requestLeave() {
    setLeaveBusy(true);
    try {
      const res = await fetch(`/api/employees/${employee.id}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaveType,
          reason: leaveReason || null,
          startDate: leaveStart,
          endDate: leaveEnd,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        appToast.error(data.message || "هەڵەیەک ڕوویدا.");
        return;
      }
      setLeaves((prev) => [
        {
          id: data.data.id,
          leaveType: data.data.leaveType,
          reason: data.data.reason,
          startDate: data.data.startDate,
          endDate: data.data.endDate,
          status: data.data.status,
          reviewedBy: null,
        },
        ...prev,
      ]);
      setLeaveReason("");
      appToast.success("داواکاری مۆڵەت نێردرا");
    } catch {
      appToast.error("هەڵەیەک ڕوویدا.");
    } finally {
      setLeaveBusy(false);
    }
  }

  async function reviewLeave(leaveId: string, status: "APPROVED" | "REJECTED") {
    try {
      const res = await fetch(
        `/api/employees/${employee.id}/leave/${leaveId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }
      );
      const data = await res.json();
      if (!data.success) {
        appToast.error(data.message || "هەڵەیەک ڕوویدا.");
        return;
      }
      setLeaves((prev) =>
        prev.map((l) =>
          l.id === leaveId
            ? {
                ...l,
                status: data.data.status,
                reviewedBy: data.data.reviewedBy,
              }
            : l
        )
      );
      appToast.success("مۆڵەت یەکلا کرایەوە", LEAVE_STATUS_LABELS[status]);
    } catch {
      appToast.error("هەڵەیەک ڕوویدا.");
    }
  }

  async function saveSalary() {
    setSalaryBusy(true);
    try {
      const res = await fetch(`/api/employees/${employee.id}/salary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: salaryAmount,
          month: salaryMonth,
          year: salaryYear,
          paymentDate: salaryPaymentDate || null,
          nextSalaryDate: salaryNextDate || null,
          status: salaryStatus,
          notes: salaryNotes || null,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        appToast.error(data.message || "هەڵەیەک ڕوویدا.");
        return;
      }
      const item = {
        id: data.data.id,
        amount: Number(data.data.amount),
        month: data.data.month,
        year: data.data.year,
        paymentDate: data.data.paymentDate,
        nextSalaryDate: data.data.nextSalaryDate,
        status: data.data.status,
        notes: data.data.notes,
      };
      setSalaries((prev) => {
        const filtered = prev.filter(
          (s) => !(s.month === item.month && s.year === item.year)
        );
        return [item, ...filtered].sort(
          (a, b) => b.year - a.year || b.month - a.month
        );
      });
      setEmployee((e) => ({
        ...e,
        monthlySalary: salaryAmount,
        nextSalaryDate: salaryNextDate || e.nextSalaryDate,
      }));
      appToast.success("مووچە پاشەکەوتکرا");
    } catch {
      appToast.error("هەڵەیەک ڕوویدا.");
    } finally {
      setSalaryBusy(false);
    }
  }

  const tabs: { id: TabId; label: string; icon: typeof Pencil }[] = [
    { id: "profile", label: "پرۆفایل", icon: Pencil },
    { id: "attendance", label: "ئامادەبوون", icon: CalendarDays },
    { id: "leave", label: "مۆڵەت", icon: Clock3 },
    { id: "salary", label: "مووچە", icon: Wallet },
    { id: "history", label: "مێژوو", icon: History },
  ];

  const statusTone =
    employee.status === "ACTIVE"
      ? "bg-emerald-500"
      : employee.status === "SUSPENDED"
        ? "bg-amber-500"
        : "bg-slate-500";

  return (
    <div className="space-y-6 sm:space-y-8">
      <AutoSaveBar
        status={draftStatus}
        savedAt={draftSavedAt}
        hasPendingDraft={hasPendingDraft}
        pendingSavedAt={pendingDraft?.savedAt}
        onRestore={() => {
          const data = restoreDraft();
          if (data) {
            setForm(data);
            setEditing(true);
            setTab("profile");
          }
        }}
        onDiscard={discardDraft}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/dashboard/employees"
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:border-[#FFAE42]/30 hover:text-[#FFAE42]"
        >
          <ArrowRight size={16} />
          گەڕانەوە
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <AutoSaveStatus status={draftStatus} savedAt={draftSavedAt} />
          {employee.status !== "ACTIVE" ? (
            <button
              type="button"
              onClick={() => void setStatus("ACTIVE")}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white"
            >
              <UserCheck size={16} />
              چالاککردن
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void setStatus("SUSPENDED")}
              className="inline-flex items-center gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-800"
            >
              <ShieldOff size={16} />
              ڕاگرتن
            </button>
          )}
          {editing ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#FFAE42] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? "پاشەکەوت..." : "پاشەکەوتکردن"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setEditing(true);
                setTab("profile");
              }}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#FFAE42] px-4 py-2.5 text-sm font-bold text-white"
            >
              <Pencil size={16} />
              دەستکاری
            </button>
          )}
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-700"
          >
            <Trash2 size={16} />
            سڕینەوە
          </button>
        </div>
      </div>

      <section className="overflow-hidden rounded-[2rem] border border-[rgba(255, 174, 66,0.1)] bg-white shadow-sm">
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
          <div className="relative h-28 w-28 overflow-hidden rounded-[1.75rem] bg-[#FFF8EF]">
            {(editing ? form.photo : employee.photo) ? (
              <Image
                src={(editing ? form.photo : employee.photo) || ""}
                alt={employee.fullName}
                fill
                unoptimized
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-[#FFAE42]/35">
                <ImagePlus size={36} />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold text-white ${statusTone}`}
              >
                {EMPLOYEE_STATUS_LABELS[employee.status]}
              </span>
              <span className="rounded-full bg-[#FFAE42]/10 px-3 py-1 text-xs font-bold text-[#FFAE42]">
                {EMPLOYEE_ROLE_LABELS[employee.role] || employee.role}
              </span>
            </div>
            <h1 className="text-3xl font-black text-[#1f1218] sm:text-4xl">
              {employee.fullName}
            </h1>
            <p className="mt-1 text-slate-500">
              @{employee.username}
              {employee.position ? ` · ${employee.position}` : ""}
              {employee.department ? ` · ${employee.department}` : ""}
            </p>
            <p className="mt-2 text-sm text-slate-400">
              دروستکراو لەلایەن{" "}
              {employee.createdBy?.fullName || "—"} · دامەزراندن{" "}
              {toInputDate(employee.dateJoined)}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:min-w-[240px]">
            <Stat
              label="مووچە"
              value={`${formatMoney(employee.monthlySalary)} IQD`}
            />
            <Stat
              label="مووچەی داهاتوو"
              value={toInputDate(employee.nextSalaryDate) || "—"}
            />
          </div>
        </div>
      </section>

      <div className="rek-tabs-scroll">
        <div className="inline-flex min-w-full gap-2 rounded-[1.5rem] border border-[rgba(255, 174, 66,0.08)] bg-white p-2 shadow-sm">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition ${
                tab === id
                  ? "bg-[#FFAE42] text-white shadow-md shadow-[#FFAE42]/25"
                  : "text-slate-500 hover:bg-[#FFF8EF] hover:text-[#FFAE42]"
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-[2rem] border border-[rgba(255, 174, 66,0.08)] bg-white p-6 shadow-sm sm:p-8">
        {tab === "profile" && (
          <div className="space-y-6">
            <h2 className="text-xl font-black text-[#FFAE42]">
              زانیاری کارمەند
            </h2>

            {editing && (
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-[#FFAE42]/25 bg-[#FFF8EF] px-4 py-2 text-sm font-bold text-[#FFAE42]">
                <ImagePlus size={16} />
                {uploading ? "بارکردن..." : "گۆڕینی وێنە"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadPhoto(file);
                  }}
                />
              </label>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="ناوی تەواو">
                {editing ? (
                  <input
                    className={inputClass}
                    value={form.fullName}
                    onChange={(e) => updateForm("fullName", e.target.value)}
                  />
                ) : (
                  <Value>{employee.fullName}</Value>
                )}
              </Field>
              <Field label="ناوی بەکارهێنەر">
                {editing ? (
                  <input
                    className={inputClass}
                    value={form.username}
                    onChange={(e) => updateForm("username", e.target.value)}
                  />
                ) : (
                  <Value>@{employee.username}</Value>
                )}
              </Field>
              <Field label="مۆبایل">
                {editing ? (
                  <input
                    className={inputClass}
                    value={form.phone || ""}
                    onChange={(e) => updateForm("phone", e.target.value)}
                  />
                ) : (
                  <Value>{employee.phone || "—"}</Value>
                )}
              </Field>
              <Field label="ئیمەیڵ">
                {editing ? (
                  <input
                    className={inputClass}
                    value={form.email || ""}
                    onChange={(e) => updateForm("email", e.target.value)}
                  />
                ) : (
                  <Value>{employee.email || "—"}</Value>
                )}
              </Field>
              <Field label="ناسنامە">
                {editing ? (
                  <input
                    className={inputClass}
                    value={form.nationalId || ""}
                    onChange={(e) => updateForm("nationalId", e.target.value)}
                  />
                ) : (
                  <Value>{employee.nationalId || "—"}</Value>
                )}
              </Field>
              <Field label="ناونیشان">
                {editing ? (
                  <input
                    className={inputClass}
                    value={form.address || ""}
                    onChange={(e) => updateForm("address", e.target.value)}
                  />
                ) : (
                  <Value>{employee.address || "—"}</Value>
                )}
              </Field>
              <Field label="پۆست">
                {editing ? (
                  <input
                    className={inputClass}
                    value={form.position || ""}
                    onChange={(e) => updateForm("position", e.target.value)}
                  />
                ) : (
                  <Value>{employee.position || "—"}</Value>
                )}
              </Field>
              <Field label="بەش">
                {editing ? (
                  <input
                    className={inputClass}
                    value={form.department || ""}
                    onChange={(e) => updateForm("department", e.target.value)}
                  />
                ) : (
                  <Value>{employee.department || "—"}</Value>
                )}
              </Field>
              <Field label="ڕۆڵ">
                {editing ? (
                  <select
                    className={inputClass}
                    value={form.role}
                    onChange={(e) =>
                      updateForm(
                        "role",
                        e.target.value as EmployeeFormValues["role"]
                      )
                    }
                  >
                    {employeeRoles.map((role) => (
                      <option key={role} value={role}>
                        {EMPLOYEE_ROLE_LABELS[role]}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Value>{EMPLOYEE_ROLE_LABELS[employee.role]}</Value>
                )}
              </Field>
              <Field label="دۆخ">
                {editing ? (
                  <select
                    className={inputClass}
                    value={form.status}
                    onChange={(e) =>
                      updateForm(
                        "status",
                        e.target.value as EmployeeFormValues["status"]
                      )
                    }
                  >
                    {(["ACTIVE", "INACTIVE", "SUSPENDED"] as const).map((s) => (
                      <option key={s} value={s}>
                        {EMPLOYEE_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Value>{EMPLOYEE_STATUS_LABELS[employee.status]}</Value>
                )}
              </Field>
              <Field label="مووچەی مانگانە">
                {editing ? (
                  <input
                    type="number"
                    className={inputClass}
                    value={form.monthlySalary}
                    onChange={(e) =>
                      updateForm("monthlySalary", Number(e.target.value))
                    }
                  />
                ) : (
                  <Value>
                    {formatMoney(employee.monthlySalary)} IQD
                  </Value>
                )}
              </Field>
              <Field label="بەرواری دامەزراندن">
                {editing ? (
                  <input
                    type="date"
                    className={inputClass}
                    value={form.dateJoined || ""}
                    onChange={(e) => updateForm("dateJoined", e.target.value)}
                  />
                ) : (
                  <Value>{toInputDate(employee.dateJoined)}</Value>
                )}
              </Field>
            </div>

            <Field label="تێبینی">
              {editing ? (
                <textarea
                  rows={4}
                  className={inputClass}
                  value={form.notes || ""}
                  onChange={(e) => updateForm("notes", e.target.value)}
                />
              ) : (
                <Value>{employee.notes || "—"}</Value>
              )}
            </Field>
          </div>
        )}

        {tab === "attendance" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-black text-[#FFAE42]">
                کالێندەری ئامادەبوون
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-xl border px-3 py-2 text-sm font-bold"
                  onClick={() => {
                    const d = new Date(Date.UTC(calYear, calMonth - 2, 1));
                    setCalYear(d.getUTCFullYear());
                    setCalMonth(d.getUTCMonth() + 1);
                  }}
                >
                  پێشوو
                </button>
                <span className="min-w-[110px] text-center font-bold">
                  {calMonth} / {calYear}
                </span>
                <button
                  type="button"
                  className="rounded-xl border px-3 py-2 text-sm font-bold"
                  onClick={() => {
                    const d = new Date(Date.UTC(calYear, calMonth, 1));
                    setCalYear(d.getUTCFullYear());
                    setCalMonth(d.getUTCMonth() + 1);
                  }}
                >
                  داهاتوو
                </button>
              </div>
            </div>

            <AttendanceCalendar
              year={calYear}
              month={calMonth}
              items={monthAttendances}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />

            <div className="grid gap-4 rounded-2xl bg-[#FFF8EF]/50 p-4 md:grid-cols-4">
              <Field label="بەروار">
                <input
                  type="date"
                  className={inputClass}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </Field>
              <Field label="دۆخ">
                <select
                  className={inputClass}
                  value={attStatus}
                  onChange={(e) =>
                    setAttStatus(
                      e.target.value as (typeof attendanceStatuses)[number]
                    )
                  }
                >
                  {attendanceStatuses.map((s) => (
                    <option key={s} value={s}>
                      {ATTENDANCE_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="تێبینی">
                <input
                  className={inputClass}
                  value={attNotes}
                  onChange={(e) => setAttNotes(e.target.value)}
                />
              </Field>
              <div className="flex items-end">
                <button
                  type="button"
                  disabled={attBusy}
                  onClick={() => void saveAttendance()}
                  className="w-full rounded-2xl bg-[#FFAE42] px-4 py-3 font-bold text-white disabled:opacity-50"
                >
                  {attBusy ? "..." : "تۆمارکردنی ڕۆژ"}
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === "leave" && (
          <div className="space-y-6">
            <h2 className="text-xl font-black text-[#FFAE42]">
              بەڕێوەبردنی مۆڵەت
            </h2>

            <div className="grid gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 md:grid-cols-2">
              <Field label="جۆری مۆڵەت">
                <select
                  className={inputClass}
                  value={leaveType}
                  onChange={(e) =>
                    setLeaveType(e.target.value as (typeof leaveTypes)[number])
                  }
                >
                  {leaveTypes.map((t) => (
                    <option key={t} value={t}>
                      {LEAVE_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="هۆکار">
                <input
                  className={inputClass}
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                />
              </Field>
              <Field label="دەستپێک">
                <input
                  type="date"
                  className={inputClass}
                  value={leaveStart}
                  onChange={(e) => setLeaveStart(e.target.value)}
                />
              </Field>
              <Field label="کۆتایی">
                <input
                  type="date"
                  className={inputClass}
                  value={leaveEnd}
                  onChange={(e) => setLeaveEnd(e.target.value)}
                />
              </Field>
              <div className="md:col-span-2">
                <button
                  type="button"
                  disabled={leaveBusy}
                  onClick={() => void requestLeave()}
                  className="rounded-2xl bg-[#FFAE42] px-5 py-3 font-bold text-white disabled:opacity-50"
                >
                  {leaveBusy ? "..." : "داواکردنی مۆڵەت"}
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {leaves.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-slate-500">
                  هیچ داواکارییەک نییە.
                </p>
              ) : (
                leaves.map((leave) => (
                  <div
                    key={leave.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3"
                  >
                    <div>
                      <p className="font-bold text-slate-800">
                        {LEAVE_TYPE_LABELS[leave.leaveType] || leave.leaveType}
                      </p>
                      <p className="text-xs text-slate-500">
                        {toInputDate(leave.startDate)} →{" "}
                        {toInputDate(leave.endDate)}
                        {leave.reason ? ` · ${leave.reason}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          leave.status === "APPROVED"
                            ? "bg-emerald-100 text-emerald-700"
                            : leave.status === "REJECTED"
                              ? "bg-rose-100 text-rose-700"
                              : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {LEAVE_STATUS_LABELS[leave.status]}
                      </span>
                      {leave.status === "PENDING" && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              void reviewLeave(leave.id, "APPROVED")
                            }
                            className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white"
                          >
                            پەسەند
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void reviewLeave(leave.id, "REJECTED")
                            }
                            className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white"
                          >
                            ڕەتکردنەوە
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {tab === "salary" && (
          <div className="space-y-6">
            <h2 className="text-xl font-black text-[#FFAE42]">
              مووچە و مێژوو
            </h2>

            <div className="grid gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 md:grid-cols-3">
              <Field label="بڕ">
                <input
                  type="number"
                  className={inputClass}
                  value={salaryAmount}
                  onChange={(e) => setSalaryAmount(Number(e.target.value))}
                />
              </Field>
              <Field label="مانگ">
                <input
                  type="number"
                  min={1}
                  max={12}
                  className={inputClass}
                  value={salaryMonth}
                  onChange={(e) => setSalaryMonth(Number(e.target.value))}
                />
              </Field>
              <Field label="ساڵ">
                <input
                  type="number"
                  className={inputClass}
                  value={salaryYear}
                  onChange={(e) => setSalaryYear(Number(e.target.value))}
                />
              </Field>
              <Field label="بەرواری پارەدان">
                <input
                  type="date"
                  className={inputClass}
                  value={salaryPaymentDate}
                  onChange={(e) => setSalaryPaymentDate(e.target.value)}
                />
              </Field>
              <Field label="مووچەی داهاتوو">
                <input
                  type="date"
                  className={inputClass}
                  value={salaryNextDate}
                  onChange={(e) => setSalaryNextDate(e.target.value)}
                />
              </Field>
              <Field label="دۆخ">
                <select
                  className={inputClass}
                  value={salaryStatus}
                  onChange={(e) =>
                    setSalaryStatus(
                      e.target.value as (typeof salaryStatuses)[number]
                    )
                  }
                >
                  {salaryStatuses.map((s) => (
                    <option key={s} value={s}>
                      {SALARY_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="تێبینی">
                <input
                  className={inputClass}
                  value={salaryNotes}
                  onChange={(e) => setSalaryNotes(e.target.value)}
                />
              </Field>
              <div className="flex items-end md:col-span-2">
                <button
                  type="button"
                  disabled={salaryBusy}
                  onClick={() => void saveSalary()}
                  className="rounded-2xl bg-[#FFAE42] px-5 py-3 font-bold text-white disabled:opacity-50"
                >
                  {salaryBusy ? "..." : "تۆمارکردنی مووچە"}
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {salaries.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-slate-500">
                  مێژووی مووچە بەتاڵە.
                </p>
              ) : (
                salaries.map((s) => (
                  <div
                    key={s.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 px-4 py-3"
                  >
                    <div>
                      <p className="font-bold text-slate-800">
                        {s.month}/{s.year} · {formatMoney(s.amount)} IQD
                      </p>
                      <p className="text-xs text-slate-500">
                        پارەدان: {toInputDate(s.paymentDate) || "—"} · داهاتوو:{" "}
                        {toInputDate(s.nextSalaryDate) || "—"}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        s.status === "PAID"
                          ? "bg-emerald-100 text-emerald-700"
                          : s.status === "CANCELLED"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {SALARY_STATUS_LABELS[s.status]}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {tab === "history" && (
          <div className="space-y-4">
            <h2 className="text-xl font-black text-[#FFAE42]">
              مێژووی کارمەند
            </h2>
            {history.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-slate-500">
                هیچ ڕووداوێک نییە.
              </p>
            ) : (
              history.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3"
                >
                  <p className="font-bold text-slate-800">{item.message}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {item.actor?.fullName || "سیستەم"} ·{" "}
                    {formatDateTime(item.createdAt, true)}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="سڕینەوەی کارمەند"
        description={`دڵنیایت لە سڕینەوەی «${employee.fullName}»؟`}
        loading={deleting}
        confirmText={deleting ? "سڕینەوە..." : "سڕینەوە"}
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-bold text-slate-500">{label}</p>
      {children}
    </div>
  );
}

function Value({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 font-semibold text-slate-800">
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#FFF8EF]/80 px-3 py-3">
      <p className="text-[11px] font-semibold text-slate-400">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-[#FFAE42]">{value}</p>
    </div>
  );
}
