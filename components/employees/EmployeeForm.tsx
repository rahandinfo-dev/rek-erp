"use client";
import { toDateInputValue } from "@/lib/utils/datetime";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ImagePlus } from "lucide-react";
import { appToast } from "@/lib/toast";
import {
  employeeRoles,
  employeeStatuses,
  type EmployeeFormValues,
} from "@/lib/validators/employee";
import {
  EMPLOYEE_ROLE_LABELS,
  EMPLOYEE_STATUS_LABELS,
} from "@/lib/employees/labels";
import { useFormDraft } from "@/lib/hooks/useFormDraft";
import { DRAFT_KEYS } from "@/lib/drafts/types";
import { AutoSaveBar } from "@/components/ui/AutoSaveStatus";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-[#FFAE42] focus:bg-white";

export default function EmployeeForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<EmployeeFormValues>({
    photo: "",
    fullName: "",
    username: "",
    phone: "",
    email: "",
    address: "",
    nationalId: "",
    position: "",
    department: "",
    role: "STAFF",
    status: "ACTIVE",
    monthlySalary: 0,
    nextSalaryDate: "",
    dateJoined: toDateInputValue(),
    notes: "",
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
    key: DRAFT_KEYS.employeeNew,
    value: form,
    isEmpty: (v) =>
      !v.fullName.trim() &&
      !(v.username || "").trim() &&
      !v.phone?.trim() &&
      !v.email?.trim() &&
      !v.notes?.trim() &&
      !v.photo,
  });

  function update<K extends keyof EmployeeFormValues>(
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
      update("photo", data.data.url);
      appToast.success("وێنە بارکرا");
    } catch {
      appToast.error("بارکردنی وێنە سەرنەکەوت.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
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
      appToast.success("کارمەند زیادکرا", data.message);
      clearDraft();
      router.push(`/dashboard/employees/${data.data.id}`);
      router.refresh();
    } catch {
      appToast.error("هەڵەیەک ڕوویدا.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <AutoSaveBar
        status={draftStatus}
        savedAt={draftSavedAt}
        hasPendingDraft={hasPendingDraft}
        pendingSavedAt={pendingDraft?.savedAt}
        onRestore={() => {
          const data = restoreDraft();
          if (data) setForm(data);
        }}
        onDiscard={discardDraft}
      />

      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <div className="relative h-24 w-24 overflow-hidden rounded-3xl bg-[#FFF8EF]">
          {form.photo ? (
            <Image
              src={form.photo}
              alt="photo"
              fill
              unoptimized
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[#FFAE42]/40">
              <ImagePlus size={28} />
            </div>
          )}
        </div>
        <label className="cursor-pointer rounded-2xl border border-[#FFAE42]/25 bg-[#FFF8EF] px-4 py-2.5 text-sm font-bold text-[#FFAE42]">
          {uploading ? "بارکردن..." : "وێنەی کارمەند"}
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
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="ناوی تەواو">
          <input
            required
            value={form.fullName}
            onChange={(e) => update("fullName", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="ناوی بەکارهێنەر">
          <input
            required
            value={form.username}
            onChange={(e) => update("username", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="مۆبایل">
          <input
            value={form.phone || ""}
            onChange={(e) => update("phone", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="ئیمەیڵ">
          <input
            type="email"
            value={form.email || ""}
            onChange={(e) => update("email", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="ناسنامەی نیشتمانی">
          <input
            value={form.nationalId || ""}
            onChange={(e) => update("nationalId", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="ناونیشان">
          <input
            value={form.address || ""}
            onChange={(e) => update("address", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="پۆست">
          <input
            value={form.position || ""}
            onChange={(e) => update("position", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="بەش">
          <input
            value={form.department || ""}
            onChange={(e) => update("department", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="ڕۆڵ">
          <select
            value={form.role}
            onChange={(e) =>
              update("role", e.target.value as EmployeeFormValues["role"])
            }
            className={inputClass}
          >
            {employeeRoles.map((role) => (
              <option key={role} value={role}>
                {EMPLOYEE_ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="دۆخ">
          <select
            value={form.status}
            onChange={(e) =>
              update("status", e.target.value as EmployeeFormValues["status"])
            }
            className={inputClass}
          >
            {employeeStatuses.map((status) => (
              <option key={status} value={status}>
                {EMPLOYEE_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="مووچەی مانگانە">
          <input
            type="number"
            min={0}
            value={form.monthlySalary}
            onChange={(e) => update("monthlySalary", Number(e.target.value))}
            className={inputClass}
          />
        </Field>
        <Field label="بەرواری دامەزراندن">
          <input
            type="date"
            value={form.dateJoined || ""}
            onChange={(e) => update("dateJoined", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="بەرواری مووچەی داهاتوو">
          <input
            type="date"
            value={form.nextSalaryDate || ""}
            onChange={(e) => update("nextSalaryDate", e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="تێبینی">
        <textarea
          rows={4}
          value={form.notes || ""}
          onChange={(e) => update("notes", e.target.value)}
          className={inputClass}
        />
      </Field>

      <button
        type="submit"
        disabled={saving}
        className="rounded-2xl bg-[#FFAE42] px-6 py-3 font-bold text-white disabled:opacity-50"
      >
        {saving ? "پاشەکەوت..." : "زیادکردنی کارمەند"}
      </button>
    </form>
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
      <label className="mb-2 block font-bold">{label}</label>
      {children}
    </div>
  );
}
