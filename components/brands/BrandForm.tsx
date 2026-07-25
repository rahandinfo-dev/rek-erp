"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { appToast } from "@/lib/toast";
import { useFormDraft } from "@/lib/hooks/useFormDraft";
import { DRAFT_KEYS } from "@/lib/drafts/types";
import { AutoSaveBar } from "@/components/ui/AutoSaveStatus";

type BrandDraft = { name: string };

export default function BrandForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const draftValue = useMemo<BrandDraft>(() => ({ name }), [name]);

  const {
    status: draftStatus,
    savedAt: draftSavedAt,
    hasPendingDraft,
    pendingDraft,
    restoreDraft,
    discardDraft,
    clearDraft,
  } = useFormDraft({
    key: DRAFT_KEYS.brandNew,
    value: draftValue,
    isEmpty: (v) => !v.name.trim(),
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      appToast.error("تکایە ناوی براند بنووسە.");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await response.json();

      if (!response.ok) {
        appToast.error(data.message || "هەڵەیەک ڕوویدا.");
        return;
      }

      clearDraft();
      appToast.success("براند بە سەرکەوتوویی زیادکرا.");
      setName("");
      router.push("/dashboard/brands");
      router.refresh();
    } catch {
      appToast.error("هەڵەیەک ڕوویدا.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="rek-card space-y-6 p-6 sm:p-8">
      <AutoSaveBar
        status={draftStatus}
        savedAt={draftSavedAt}
        hasPendingDraft={hasPendingDraft}
        pendingSavedAt={pendingDraft?.savedAt}
        onRestore={() => {
          const data = restoreDraft();
          if (data) setName(data.name || "");
        }}
        onDiscard={discardDraft}
      />

      <div>
        <label
          htmlFor="brand-name"
          className="mb-2 block text-sm font-bold text-foreground"
        >
          ناوی براند
        </label>
        <input
          id="brand-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ناوی براند"
          className="w-full rounded-2xl border border-border bg-card p-3 outline-none focus:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/35"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        aria-busy={loading}
        className="rounded-2xl bg-primary px-8 py-3 font-bold text-primary-foreground transition hover:bg-[var(--brand-hover)] disabled:opacity-50"
      >
        {loading ? "چاوەڕێ بکە..." : "زیادکردنی براند"}
      </button>
    </form>
  );
}
