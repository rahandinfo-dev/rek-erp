"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { appToast } from "@/lib/toast";
import { useFormDraft } from "@/lib/hooks/useFormDraft";
import { DRAFT_KEYS } from "@/lib/drafts/types";
import { AutoSaveBar } from "@/components/ui/AutoSaveStatus";
import { useT } from "@/components/i18n/LocaleProvider";

type UnitDraft = { name: string; symbol: string; active: boolean };

export default function UnitForm() {
  const { t } = useT();
  const router = useRouter();
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(false);

  const draftValue = useMemo<UnitDraft>(
    () => ({ name, symbol, active }),
    [name, symbol, active]
  );

  const {
    status: draftStatus,
    savedAt: draftSavedAt,
    hasPendingDraft,
    pendingDraft,
    restoreDraft,
    discardDraft,
    clearDraft,
  } = useFormDraft({
    key: DRAFT_KEYS.unitNew,
    value: draftValue,
    isEmpty: (v) => !v.name.trim() && !v.symbol.trim() && v.active,
  });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, symbol, active }),
      });
      const data = await response.json();

      if (!data.success) {
        appToast.error(data.message || t("errors.generic"));
        return;
      }

      clearDraft();
      appToast.success(t("units.created"), data.message);
      router.push("/dashboard/units");
      router.refresh();
    } catch {
      appToast.error(t("errors.generic"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8"
    >
      <AutoSaveBar
        status={draftStatus}
        savedAt={draftSavedAt}
        hasPendingDraft={hasPendingDraft}
        pendingSavedAt={pendingDraft?.savedAt}
        onRestore={() => {
          const data = restoreDraft();
          if (!data) return;
          setName(data.name || "");
          setSymbol(data.symbol || "");
          setActive(data.active !== false);
        }}
        onDiscard={discardDraft}
      />

      <div>
        <label className="mb-2 block font-bold">{t("units.nameLabel")}</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("units.namePlaceholder")}
          className="w-full rounded-xl border border-border bg-background p-3 outline-none focus:border-primary"
          required
        />
      </div>

      <div>
        <label className="mb-2 block font-bold">{t("units.symbolLabel")}</label>
        <input
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          placeholder={t("units.symbolPlaceholder")}
          className="w-full rounded-xl border border-border bg-background p-3 outline-none focus:border-primary"
          required
        />
      </div>

      <label className="inline-flex items-center gap-3 font-bold">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="size-5"
        />
        {t("units.activeLabel")}
      </label>

      <button
        type="submit"
        disabled={loading}
        className="rounded-2xl bg-primary px-6 py-3 font-bold text-primary-foreground transition hover:bg-[var(--brand-hover)] disabled:opacity-50"
      >
        {loading ? t("common.wait") : t("units.add")}
      </button>
    </form>
  );
}
