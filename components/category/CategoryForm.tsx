"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { appToast } from "@/lib/toast";
import { useFormDraft } from "@/lib/hooks/useFormDraft";
import { DRAFT_KEYS } from "@/lib/drafts/types";
import { AutoSaveBar } from "@/components/ui/AutoSaveStatus";

type Props = {
  category?: {
    id: string;
    name: string;
    description: string | null;
  };
};

type CategoryDraft = { name: string; description: string };

export default function CategoryForm({ category }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(category?.name ?? "");
  const [description, setDescription] = useState(category?.description ?? "");

  const draftValue = useMemo<CategoryDraft>(
    () => ({ name, description }),
    [name, description]
  );

  const draftKey = category
    ? `${DRAFT_KEYS.categoryEdit}:${category.id}`
    : DRAFT_KEYS.categoryNew;

  const {
    status: draftStatus,
    savedAt: draftSavedAt,
    hasPendingDraft,
    pendingDraft,
    restoreDraft,
    discardDraft,
    clearDraft,
  } = useFormDraft({
    key: draftKey,
    value: draftValue,
    isEmpty: (v) => !v.name.trim() && !v.description.trim(),
  });

  async function saveCategory() {
    if (!name.trim()) {
      appToast.error("تکایە ناوی پۆل بنووسە.");
      return;
    }

    try {
      setLoading(true);
      const editing = !!category;

      const res = await fetch(
        editing ? `/api/categories/${category.id}` : "/api/categories",
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, description }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        appToast.error(data.message || "هەڵەیەک ڕوویدا.");
        return;
      }

      clearDraft();
      appToast.success(
        editing
          ? "پۆل بە سەرکەوتوویی نوێکرایەوە."
          : "پۆل بە سەرکەوتوویی زیادکرا."
      );

      router.push("/dashboard/category");
      router.refresh();
    } catch {
      appToast.error("هەڵەیەک ڕوویدا.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rek-card p-6 sm:p-8">
      <div className="space-y-6">
        <AutoSaveBar
          status={draftStatus}
          savedAt={draftSavedAt}
          hasPendingDraft={hasPendingDraft}
          pendingSavedAt={pendingDraft?.savedAt}
          onRestore={() => {
            const data = restoreDraft();
            if (!data) return;
            setName(data.name || "");
            setDescription(data.description || "");
          }}
          onDiscard={discardDraft}
        />

        <div>
          <label
            htmlFor="category-name"
            className="mb-2 block text-sm font-bold text-foreground"
          >
            ناوی پۆل
          </label>
          <input
            id="category-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-11 w-full rounded-2xl border border-border bg-card px-4 outline-none focus:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/35"
            placeholder="ناوی پۆل"
          />
        </div>

        <div>
          <label
            htmlFor="category-description"
            className="mb-2 block text-sm font-bold text-foreground"
          >
            وەسف
          </label>
          <textarea
            id="category-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full rounded-2xl border border-border bg-card px-4 py-3 outline-none focus:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/35"
            placeholder="وەسف (ئارەزوومەندانە)"
          />
        </div>

        <button
          type="button"
          disabled={loading}
          aria-busy={loading}
          onClick={() => void saveCategory()}
          className="h-11 rounded-2xl bg-primary px-6 font-bold text-primary-foreground transition hover:bg-[var(--brand-hover)] disabled:opacity-60"
        >
          {loading ? "چاوەڕوان بە..." : category ? "نوێکردنەوە" : "زیادکردن"}
        </button>
      </div>
    </div>
  );
}
