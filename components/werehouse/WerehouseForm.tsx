"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { appToast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { inputClassName, textareaClassName } from "@/components/ui/FormPrimitives";
import { useFormDraft } from "@/lib/hooks/useFormDraft";
import { DRAFT_KEYS } from "@/lib/drafts/types";
import { AutoSaveBar, AutoSaveStatus } from "@/components/ui/AutoSaveStatus";

type WarehouseDraft = {
  name: string;
  code: string;
  address: string;
  capacity: string;
  isMain: boolean;
};

function isEmpty(v: WarehouseDraft) {
  return (
    !v.name.trim() &&
    !v.code.trim() &&
    !v.address.trim() &&
    !v.capacity.trim() &&
    !v.isMain
  );
}

export default function WarehouseForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");
  const [capacity, setCapacity] = useState("");
  const [isMain, setIsMain] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const draftValue = useMemo<WarehouseDraft>(
    () => ({ name, code, address, capacity, isMain }),
    [name, code, address, capacity, isMain]
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
    key: DRAFT_KEYS.warehouseNew,
    value: draftValue,
    isEmpty,
  });

  function applyDraft(data: WarehouseDraft) {
    setName(data.name || "");
    setCode(data.code || "");
    setAddress(data.address || "");
    setCapacity(data.capacity || "");
    setIsMain(Boolean(data.isMain));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");

    if (!name.trim() || !code.trim()) {
      setError("تکایە ناوی کۆگا و کۆدی کۆگا پڕبکەرەوە.");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/werehouses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          code,
          address,
          isMain,
          capacity: capacity === "" ? null : Number(capacity),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "هەڵەیەک ڕوویدا.");
        appToast.error(data.message || "هەڵەیەک ڕوویدا.");
        return;
      }

      clearDraft();
      appToast.warehouseUpdated("کۆگا بە سەرکەوتوویی زیادکرا.");
      router.push("/dashboard/werehouse");
      router.refresh();
    } catch (err) {
      console.error(err);
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
            if (data) applyDraft(data);
          }}
          onDiscard={discardDraft}
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
            placeholder="WH-01"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold">ناونیشان</label>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className={textareaClassName}
            rows={3}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold">توانا (ئۆپشناڵ)</label>
          <input
            type="number"
            min={0}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            className={inputClassName}
          />
        </div>

        <label className="flex items-center gap-2 text-sm font-bold">
          <input
            type="checkbox"
            checked={isMain}
            onChange={(e) => setIsMain(e.target.checked)}
          />
          کۆگای سەرەکی
        </label>

        {error ? (
          <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <AutoSaveStatus status={draftStatus} savedAt={draftSavedAt} />
          <Button type="submit" disabled={loading}>
            {loading ? "چاوەڕێ بکە..." : "زیادکردنی کۆگا"}
          </Button>
        </div>
      </form>
    </div>
  );
}
