"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { appToast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { inputClassName, textareaClassName } from "@/components/ui/FormPrimitives";
import { useFormDraft } from "@/lib/hooks/useFormDraft";
import { DRAFT_KEYS } from "@/lib/drafts/types";
import { AutoSaveBar, AutoSaveStatus } from "@/components/ui/AutoSaveStatus";
import ImageUpload from "@/components/uploads/ImageUpload";

type Werehouse = {
  id: string;
  name: string;
  code: string;
  address: string | null;
  isMain: boolean;
  capacity?: unknown;
  image?: string | null;
};

type Props = {
  werehouse: Werehouse;
};

type WarehouseDraft = {
  name: string;
  code: string;
  address: string;
  capacity: string;
  isMain: boolean;
  image: string;
};

export default function EditWerehouseForm({ werehouse }: Props) {
  const router = useRouter();

  const [name, setName] = useState(werehouse.name);
  const [code, setCode] = useState(werehouse.code);
  const [address, setAddress] = useState(werehouse.address ?? "");
  const [capacity, setCapacity] = useState(
    werehouse.capacity != null && Number(werehouse.capacity) > 0
      ? String(Number(werehouse.capacity))
      : ""
  );
  const [isMain, setIsMain] = useState(werehouse.isMain);
  const [image, setImage] = useState(werehouse.image ?? "");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const draftValue = useMemo<WarehouseDraft>(
    () => ({ name, code, address, capacity, isMain, image }),
    [name, code, address, capacity, isMain, image]
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
    key: `${DRAFT_KEYS.warehouseEdit}:${werehouse.id}`,
    value: draftValue,
    isEmpty: () => false,
  });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");

    if (!name.trim()) {
      setError("تکایە ناوی کۆگا بنووسە.");
      return;
    }

    if (!code.trim()) {
      setError("تکایە کۆدی کۆگا بنووسە.");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`/api/werehouses/${werehouse.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          code,
          address,
          isMain,
          capacity: capacity === "" ? null : Number(capacity),
          image: image || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "هەڵەیەک ڕوویدا.");
        appToast.error(data.message || "هەڵەیەک ڕوویدا.");
        return;
      }

      clearDraft();
      appToast.warehouseUpdated();
      router.push("/dashboard/werehouse");
      router.refresh();
    } catch {
      setError("هەڵەیەک ڕوویدا.");
      appToast.error("هەڵەیەک ڕوویدا.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rek-card p-6 sm:p-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        <AutoSaveBar
          status={draftStatus}
          savedAt={draftSavedAt}
          hasPendingDraft={hasPendingDraft}
          pendingSavedAt={pendingDraft?.savedAt}
          onRestore={() => {
            const data = restoreDraft();
            if (!data) return;
            setName(data.name || "");
            setCode(data.code || "");
            setAddress(data.address || "");
            setCapacity(data.capacity || "");
            setIsMain(Boolean(data.isMain));
            setImage(data.image || "");
          }}
          onDiscard={discardDraft}
        />

        <ImageUpload
          kind="warehouse"
          value={image || null}
          onChange={(url) => setImage(url || "")}
          label="وێنەی کۆگا"
          shape="square"
        />

        <div>
          <label className="mb-2 block text-sm font-bold">ناوی کۆگا</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClassName}
            placeholder="ناوی کۆگا"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold">کۆدی کۆگا</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className={inputClassName}
            placeholder="WH-001"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold">توانای کۆگا</label>
          <input
            type="number"
            min="0"
            step="1"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            className={inputClassName}
            placeholder="بڕی زۆرترین یەکە (ئارەزوومەندانە)"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold">ناونیشان</label>
          <textarea
            rows={4}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className={textareaClassName}
            placeholder="ناونیشانی کۆگا..."
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            id="isMain"
            type="checkbox"
            checked={isMain}
            onChange={(e) => setIsMain(e.target.checked)}
            className="size-5 rounded border-border"
          />
          <label htmlFor="isMain" className="font-semibold">
            ئەمە کۆگای سەرەکییە
          </label>
        </div>

        {error && (
          <div className="rounded-xl border border-destructive/25 bg-[color-mix(in_srgb,var(--destructive)_8%,white)] p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <AutoSaveStatus status={draftStatus} savedAt={draftSavedAt} />
          <Button type="submit" disabled={loading} size="lg">
            {loading ? "چاوەڕوانبە..." : "پاشەکەوتکردنی گۆڕانکاری"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => router.push("/dashboard/werehouse")}
          >
            هەڵوەشاندنەوە
          </Button>
        </div>
      </form>
    </div>
  );
}
