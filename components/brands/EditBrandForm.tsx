"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { appToast } from "@/lib/toast";
import { FormSkeleton } from "@/components/ui/Skeleton";
import { useFormDraft } from "@/lib/hooks/useFormDraft";
import { DRAFT_KEYS } from "@/lib/drafts/types";
import { AutoSaveBar } from "@/components/ui/AutoSaveStatus";
import { useT } from "@/components/i18n/LocaleProvider";

type Props = {
  id: string;
};

type BrandDraft = { name: string };

export default function EditBrandForm({ id }: Props) {
  const { t } = useT();
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    async function fetchBrand() {
      try {
        const response = await fetch(`/api/brands/${id}`);
        const data = await response.json();

        if (!response.ok) {
          appToast.error(data.message || t("errors.generic"));
          router.push("/dashboard/brands");
          return;
        }

        setName(data.data.name);
        setHydrated(true);
      } catch {
        appToast.error(t("errors.generic"));
      } finally {
        setPageLoading(false);
      }
    }

    void fetchBrand();
  }, [id, router, t]);

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
    key: `${DRAFT_KEYS.brandEdit}:${id}`,
    value: draftValue,
    enabled: hydrated && !pageLoading,
    isEmpty: (v) => !v.name.trim(),
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      setLoading(true);
      const response = await fetch(`/api/brands/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await response.json();

      if (!response.ok) {
        appToast.error(data.message || t("errors.generic"));
        return;
      }

      clearDraft();
      appToast.success(t("brands.updated"));
      router.push("/dashboard/brands");
      router.refresh();
    } catch {
      appToast.error(t("errors.generic"));
    } finally {
      setLoading(false);
    }
  }

  if (pageLoading) {
    return <FormSkeleton />;
  }

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
          htmlFor="edit-brand-name"
          className="mb-2 block text-sm font-bold text-foreground"
        >
          {t("brands.nameLabel")}
        </label>
        <input
          id="edit-brand-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-2xl border border-border bg-card p-3 outline-none focus:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/35"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        aria-busy={loading}
        className="rounded-2xl bg-primary px-8 py-3 font-bold text-primary-foreground transition hover:bg-[var(--brand-hover)] disabled:opacity-50"
      >
        {loading ? t("common.wait") : t("brands.update")}
      </button>
    </form>
  );
}
