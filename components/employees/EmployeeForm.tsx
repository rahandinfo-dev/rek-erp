"use client";
import { toDateInputValue } from "@/lib/utils/datetime";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { appToast } from "@/lib/toast";
import {
  employeeRoles,
  employeeStatuses,
  type EmployeeFormValues,
} from "@/lib/validators/employee";
import { useFormDraft } from "@/lib/hooks/useFormDraft";
import { DRAFT_KEYS } from "@/lib/drafts/types";
import { AutoSaveBar } from "@/components/ui/AutoSaveStatus";
import ImageUpload from "@/components/uploads/ImageUpload";
import { useT } from "@/components/i18n/LocaleProvider";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-[#FFAE42] focus:bg-white";

export default function EmployeeForm() {
  const { t } = useT();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EmployeeFormValues>({
    photo: "",
    fullName: "",
    username: "",
    phone: "",
    email: "",
    address: "",
    nationalId: "",
    nationalIdImage: "",
    position: "",
    department: "",
    role: "STAFF",
    status: "ACTIVE",
    monthlySalary: 0,
    salaryCurrency: "IQD",
    salaryDueDay: 1,
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
        appToast.error(data.message || t("errors.generic"));
        return;
      }
      appToast.success(t("employees.addedTitle"), data.message);
      clearDraft();
      router.push(`/dashboard/employees/${data.data.id}`);
      router.refresh();
    } catch {
      appToast.error(t("errors.generic"));
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

      <ImageUpload
        kind="employee"
        value={form.photo || null}
        onChange={(url) => update("photo", url || "")}
        label={t("employees.photoLabel")}
        shape="circle"
      />

      <ImageUpload
        kind="employee"
        value={form.nationalIdImage || null}
        onChange={(url) => update("nationalIdImage", url || "")}
        label="وێنەی کارتی نیشتیمانی (ئارەزوومەندانە)"
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Field label={t("employees.fullName")}>
          <input
            required
            value={form.fullName}
            onChange={(e) => update("fullName", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label={t("employees.username")}>
          <input
            required
            value={form.username}
            onChange={(e) => update("username", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label={t("common.phone")}>
          <input
            required
            value={form.phone || ""}
            onChange={(e) => update("phone", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label={t("common.email")}>
          <input
            required
            type="email"
            value={form.email || ""}
            onChange={(e) => update("email", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label={t("employees.nationalId")}>
          <input
            value={form.nationalId || ""}
            onChange={(e) => update("nationalId", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label={t("common.address")}>
          <input
            required
            value={form.address || ""}
            onChange={(e) => update("address", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label={t("employees.position")}>
          <input
            required
            value={form.position || ""}
            onChange={(e) => update("position", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label={t("employees.department")}>
          <input
            value={form.department || ""}
            onChange={(e) => update("department", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label={t("employees.role")}>
          <select
            value={form.role}
            onChange={(e) =>
              update("role", e.target.value as EmployeeFormValues["role"])
            }
            className={inputClass}
          >
            {employeeRoles.map((role) => (
              <option key={role} value={role}>
                {t(`employees.roles.${role}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("common.status")}>
          <select
            value={form.status}
            onChange={(e) =>
              update("status", e.target.value as EmployeeFormValues["status"])
            }
            className={inputClass}
          >
            {employeeStatuses.map((status) => (
              <option key={status} value={status}>
                {t(`employees.statuses.${status}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("employees.monthlySalary")}>
          <input
            required
            type="number"
            min={0}
            value={form.monthlySalary}
            onChange={(e) => update("monthlySalary", Number(e.target.value))}
            className={inputClass}
          />
        </Field>
        <Field label="دراوی مووچە">
          <select value={form.salaryCurrency} onChange={(e) => update("salaryCurrency", e.target.value)} className={inputClass}>
            <option value="IQD">IQD</option><option value="USD">USD</option>
          </select>
        </Field>
        <Field label="ڕۆژی شایستەبوونی مووچە">
          <input required type="number" min={1} max={28} value={form.salaryDueDay} onChange={(e) => update("salaryDueDay", Number(e.target.value))} className={inputClass} />
        </Field>
        <Field label={t("employees.dateJoined")}>
          <input
            type="date"
            value={form.dateJoined || ""}
            onChange={(e) => update("dateJoined", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label={t("employees.nextSalaryDate")}>
          <input
            type="date"
            value={form.nextSalaryDate || ""}
            onChange={(e) => update("nextSalaryDate", e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label={t("common.notes")}>
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
        {saving ? t("common.savingShort") : t("employees.add")}
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
