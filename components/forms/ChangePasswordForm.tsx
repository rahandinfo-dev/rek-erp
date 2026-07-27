"use client";

import { useState } from "react";
import { passwordRequirements } from "@/lib/utils/passwordRequirements";
import { appToast } from "@/lib/toast";
import EmailCodePasswordReset from "@/components/forms/EmailCodePasswordReset";

export default function ChangePasswordForm() {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const reqs = passwordRequirements(form.newPassword);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (form.newPassword !== form.confirmPassword) {
      setError("وشەی نهێنی نوێ و دووپاتکردنەوە یەک ناگرنەوە.");
      return;
    }

    const allValid = Object.values(reqs).every((r) => r.valid);
    if (!allValid) {
      setError("وشەی نهێنی نوێ مەرجەکان جێبەجێ ناکات.");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || "هەڵەیەک ڕوویدا.");
        appToast.error(json.message || "هەڵەیەک ڕوویدا.");
        return;
      }
      setForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      const { pushUndoable } = await import("@/lib/undo/push");
      pushUndoable({
        module: "settings",
        kind: "password",
        label: "وشەی نهێنی گۆڕدرا",
        title: "وشەی نهێنی گۆڕدرا",
        message: "تەنها پشتڕاستکردنەوە — وشەی نهێنی هەرگیز گەڕێنرایەوە.",
        toastOnly: true,
        undo: () => undefined,
        redo: () => undefined,
      });
    } catch {
      setError("هەڵەیەک ڕوویدا.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5 border border-border bg-card p-5 shadow-sm sm:p-8"
    >
      <div>
        <h2 className="text-xl font-black text-primary">گۆڕینی وشەی نهێنی</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          وشەی نهێنی ئێستا و نوێ بە پارێزراوی پڕ بکەرەوە، یان بە کۆدی ئیمەیڵ
          گۆڕی بدە.
        </p>
      </div>

      <EmailCodePasswordReset />

      <div className="space-y-5 border-t border-border pt-5">
        <p className="text-sm text-muted-foreground">
          یان وشەی نهێنی ئێستا بنووسە بۆ گۆڕین:
        </p>

        {error ? (
          <p className="bg-red-50 p-3 text-sm text-red-700">{error}</p>
        ) : null}

        <Field
          label="وشەی نهێنی ئێستا"
          type="password"
          value={form.currentPassword}
          onChange={(v) => setForm((p) => ({ ...p, currentPassword: v }))}
          autoComplete="current-password"
        />
        <Field
          label="وشەی نهێنی نوێ"
          type="password"
          value={form.newPassword}
          onChange={(v) => setForm((p) => ({ ...p, newPassword: v }))}
          autoComplete="new-password"
        />
        <Field
          label="دووپاتکردنەوەی وشەی نهێنی"
          type="password"
          value={form.confirmPassword}
          onChange={(v) => setForm((p) => ({ ...p, confirmPassword: v }))}
          autoComplete="new-password"
        />

        <ul className="grid gap-1 text-xs sm:grid-cols-2">
          {Object.values(reqs).map((r) => (
            <li
              key={r.text}
              className={r.valid ? "text-emerald-700" : "text-muted-foreground"}
            >
              {r.valid ? "✓" : "○"} {r.text}
            </li>
          ))}
        </ul>

        <button
          type="submit"
          disabled={saving}
          className="bg-primary px-6 py-3 font-bold text-primary-foreground disabled:opacity-50"
        >
          {saving ? "چاوەڕێ بکە..." : "گۆڕینی وشەی نهێنی"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold">{label}</span>
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full border border-border px-3 outline-none focus:border-primary/50"
      />
    </label>
  );
}
