"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { appToast } from "@/lib/toast";
import { useFormDraft } from "@/lib/hooks/useFormDraft";
import { DRAFT_KEYS } from "@/lib/drafts/types";
import { AutoSaveBar } from "@/components/ui/AutoSaveStatus";

type Props = { id: string };

type UnitDraft = { name: string; symbol: string; active: boolean };

export default function EditUnitForm({ id }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    async function fetchUnit() {
      try {
        const response = await fetch(`/api/units/${id}`);
        const data = await response.json();
        if (!data.success) {
          appToast.error(data.message || "هەڵەیەک ڕوویدا.");
          return;
        }
        setName(data.data.name);
        setSymbol(data.data.symbol);
        setActive(data.data.active !== false);
        setHydrated(true);
      } catch {
        appToast.error("هەڵەیەک ڕوویدا.");
      } finally {
        setLoading(false);
      }
    }
    void fetchUnit();
  }, [id]);

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
    key: `${DRAFT_KEYS.unitEdit}:${id}`,
    value: draftValue,
    enabled: hydrated && !loading,
    isEmpty: (v) => !v.name.trim() && !v.symbol.trim(),
  });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await fetch(`/api/units/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, symbol, active }),
      });
      const data = await response.json();
      if (!data.success) {
        appToast.error(data.message || "هەڵەیەک ڕوویدا.");
        return;
      }
      clearDraft();
      appToast.success("یەکە نوێکرایەوە", data.message);
      router.push("/dashboard/units");
      router.refresh();
    } catch {
      appToast.error("هەڵەیەک ڕوویدا.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-border bg-card p-8 text-center">
        چاوەڕێ بکە...
      </div>
    );
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
        <label className="mb-2 block font-bold">ناوی یەکە</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border border-border bg-background p-3 outline-none focus:border-primary"
          required
        />
      </div>

      <div>
        <label className="mb-2 block font-bold">کورتکراوە</label>
        <input
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
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
        یەکە چالاک بێت
      </label>

      <button
        type="submit"
        disabled={saving}
        className="rounded-2xl bg-primary px-6 py-3 font-bold text-primary-foreground transition hover:bg-[var(--brand-hover)] disabled:opacity-50"
      >
        {saving ? "چاوەڕێ بکە..." : "پاشەکەوتکردنی گۆڕانکاری"}
      </button>
    </form>
  );
}
