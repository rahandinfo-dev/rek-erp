"use client";

import { useEffect, useState } from "react";
import {
  MODULE_LABELS,
  type NumberingRuleView,
  type ResetPolicy,
} from "@/lib/numbering/types";
import { appToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { useT } from "@/components/i18n/LocaleProvider";

export default function NumberingSettings() {
  const { t } = useT();
  const [rules, setRules] = useState<NumberingRuleView[]>([]);
  const [companyCode, setCompanyCode] = useState("CO");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<string>("sales");
  const [preview, setPreview] = useState("");

  useEffect(() => {
    const id = window.setTimeout(() => {
      void fetch("/api/numbering", { cache: "no-store" })
        .then((r) => r.json())
        .then((j) => {
          if (j.success) {
            setRules(j.data.rules || []);
            setCompanyCode(j.data.companyCode || "CO");
            const first = j.data.rules?.[0]?.moduleKey || "sales";
            setSelected(first);
          }
        })
        .catch(() => appToast.error("نەتوانرا ڕێکخستنی ژمارەکردنەوە بار بکرێت"))
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  const current = rules.find((r) => r.moduleKey === selected);

  useEffect(() => {
    if (!current) return;
    const id = window.setTimeout(() => {
      void fetch("/api/numbering/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          moduleKey: current.moduleKey,
          format: current.format,
          prefix: current.prefix,
          suffix: current.suffix,
          moduleCode: current.moduleCode,
          padLength: current.padLength,
          fiscalYearStartMonth: current.fiscalYearStartMonth,
          companyCode,
          sequence: current.nextValue || current.startFrom,
        }),
      })
        .then((r) => r.json())
        .then((j) => {
          if (j.success) setPreview(j.data.preview);
        })
        .catch(() => undefined);
    }, 200);
    return () => window.clearTimeout(id);
  }, [current, companyCode]);

  function patch(partial: Partial<NumberingRuleView>) {
    setRules((prev) =>
      prev.map((r) =>
        r.moduleKey === selected ? { ...r, ...partial } : r
      )
    );
  }

  async function save(resetNow = false) {
    setSaving(true);
    try {
      const res = await fetch("/api/numbering", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          companyCode,
          rules: rules.map((r) => ({
            ...r,
            resetNow: resetNow && r.moduleKey === selected,
          })),
        }),
      });
      const json = await res.json();
      if (!json.success) {
        appToast.error(json.message || "پاشەکەوت سەرنەکەوت");
        return;
      }
      setRules(json.data.rules || rules);
      appToast.success(
        resetNow
          ? "ژمارەکار گەڕێندرایەوە و ڕێکخستنەکان پاشەکەوتکران"
          : "ڕێکخستنی ژمارەکردنەوە پاشەکەوتکرا"
      );
    } catch {
      appToast.error("پاشەکەوت سەرنەکەوت");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <p className="rounded-3xl border border-border bg-card p-10 text-center text-muted-foreground">
        بارکردنی ڕێکخستنی ژمارەکردنەوە…
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground sm:text-3xl">
            ژمارەکردنەوەی زیرەکی خۆکار
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ژمارەی بەڵگەنامەی گونجاو و بێ ناکۆکی بۆ هەموو مۆدیولەکان
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => void save(false)}
            className="rounded-2xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground focus-visible:ring-[3px] focus-visible:ring-ring/35 disabled:opacity-50"
          >
            {saving ? t("numbering.saving") : t("numbering.saveSettings")}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void save(true)}
            className="rounded-2xl border border-border px-5 py-2.5 text-sm font-bold focus-visible:ring-[3px] focus-visible:ring-ring/35"
          >
            گەڕاندنەوەی ژمارەی خول
          </button>
        </div>
      </header>

      <label className="block max-w-xs text-sm font-bold">
        کۆدی کۆمپانیا
        <input
          value={companyCode}
          onChange={(e) => setCompanyCode(e.target.value.toUpperCase())}
          className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm focus-visible:ring-[3px] focus-visible:ring-ring/35"
          aria-label={t("numbering.companyCodeAria")}
          maxLength={16}
        />
      </label>

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <nav
          className="rek-card max-h-[70vh] overflow-auto p-2"
          aria-label={t("numbering.modulesAria")}
        >
          {rules.map((r) => (
            <button
              key={r.moduleKey}
              type="button"
              onClick={() => setSelected(r.moduleKey)}
              className={cn(
                "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-start text-sm font-bold focus-visible:ring-[3px] focus-visible:ring-ring/35",
                selected === r.moduleKey
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
            >
              <span>{MODULE_LABELS[r.moduleKey] || r.moduleKey}</span>
              <span
                className={cn(
                  "text-[10px] uppercase",
                  selected === r.moduleKey
                    ? "text-primary-foreground/80"
                    : "text-muted-foreground"
                )}
              >
                {r.enabled ? "چالاک" : "ناچالاک"}
              </span>
            </button>
          ))}
        </nav>

        {current && (
          <section
            className="rek-card space-y-4 p-5"
            aria-label={t("numbering.settingsAria", { module: MODULE_LABELS[current.moduleKey] })}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-black">
                {MODULE_LABELS[current.moduleKey] || current.moduleKey}
              </h2>
              <label className="inline-flex items-center gap-2 text-sm font-bold">
                <input
                  type="checkbox"
                  checked={current.enabled}
                  onChange={(e) => patch({ enabled: e.target.checked })}
                />
                {t("numbering.enableAuto")}
              </label>
            </div>

            <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 px-4 py-3">
              <p className="text-xs font-bold uppercase text-muted-foreground">
                پێشبینین
              </p>
              <p className="mt-1 font-mono text-lg font-black tracking-wide">
                {preview || current.preview || "—"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                ژمارەی داهاتوو: {current.nextValue ?? current.startFrom}
              </p>
            </div>

            <label className="block text-sm font-bold">
              فۆرمات
              <input
                value={current.format}
                onChange={(e) => patch({ format: e.target.value })}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm focus-visible:ring-[3px] focus-visible:ring-ring/35"
                spellCheck={false}
              />
              <span className="mt-1 block text-xs font-normal text-muted-foreground">
                نیشانەکان: {"{PREFIX} {SUFFIX} {YYYY} {MM} {DD} {FY} {COMPANY} {WAREHOUSE} {MODULE} {SEQ} {SEQ:6}"}
              </span>
            </label>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field
                label="پێشگر"
                value={current.prefix}
                onChange={(v) => patch({ prefix: v })}
              />
              <Field
                label="پاشگر"
                value={current.suffix}
                onChange={(v) => patch({ suffix: v })}
              />
              <Field
                label="کۆدی مۆدیول"
                value={current.moduleCode}
                onChange={(v) => patch({ moduleCode: v })}
              />
              <label className="block text-sm font-bold">
                درێژی پڕکردنەوە
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={current.padLength}
                  onChange={(e) =>
                    patch({ padLength: Number(e.target.value) || 6 })
                  }
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:ring-[3px] focus-visible:ring-ring/35"
                />
              </label>
              <label className="block text-sm font-bold">
                ژمارەی دەستپێک
                <input
                  type="number"
                  min={1}
                  value={current.startFrom}
                  onChange={(e) =>
                    patch({ startFrom: Number(e.target.value) || 1 })
                  }
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:ring-[3px] focus-visible:ring-ring/35"
                />
              </label>
              <label className="block text-sm font-bold">
                سیاسەتی گەڕاندنەوە
                <select
                  value={current.resetPolicy}
                  onChange={(e) =>
                    patch({ resetPolicy: e.target.value as ResetPolicy })
                  }
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:ring-[3px] focus-visible:ring-ring/35"
                >
                  <option value="none">هەرگیز (بەردەوام)</option>
                  <option value="yearly">ساڵانە / ساڵی دارایی</option>
                  <option value="monthly">مانگانە</option>
                </select>
              </label>
              <label className="block text-sm font-bold">
                مانگی دەستپێکی ساڵی دارایی
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={current.fiscalYearStartMonth}
                  onChange={(e) =>
                    patch({
                      fiscalYearStartMonth: Number(e.target.value) || 1,
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:ring-[3px] focus-visible:ring-ring/35"
                />
              </label>
              <label className="inline-flex items-center gap-2 self-end text-sm font-bold">
                <input
                  type="checkbox"
                  checked={current.allowManualOverride}
                  onChange={(e) =>
                    patch({ allowManualOverride: e.target.checked })
                  }
                />
                ڕێگەدان بە دەستکاری دەستی
              </label>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-sm font-bold">
      {label}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:ring-[3px] focus-visible:ring-ring/35"
      />
    </label>
  );
}
