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
import { useT } from "@/components/i18n/LocaleProvider";

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
  const { t } = useT();
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
      setError(t("warehouses.nameRequired"));
      return;
    }

    if (!code.trim()) {
      setError(t("warehouses.codeRequired"));
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
        setError(data.message || t("errors.generic"));
        appToast.error(data.message || t("errors.generic"));
        return;
      }

      clearDraft();
      appToast.warehouseUpdated();
      router.push("/dashboard/werehouse");
      router.refresh();
    } catch {
      setError(t("errors.generic"));
      appToast.error(t("errors.generic"));
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
          label={t("warehouses.imageLabel")}
          shape="square"
        />

        <div>
          <label className="mb-2 block text-sm font-bold">
            {t("warehouses.nameLabel")}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClassName}
            placeholder={t("warehouses.nameLabel")}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold">
            {t("warehouses.codeLabel")}
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className={inputClassName}
            placeholder="WH-001"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold">
            {t("warehouses.capacityLabelEdit")}
          </label>
          <input
            type="number"
            min="0"
            step="1"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            className={inputClassName}
            placeholder={t("warehouses.capacityPlaceholder")}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold">
            {t("warehouses.addressLabel")}
          </label>
          <textarea
            rows={4}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className={textareaClassName}
            placeholder={t("warehouses.addressPlaceholder")}
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
            {t("warehouses.isMainEdit")}
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
            {loading ? t("common.pleaseWait") : t("common.saveChanges")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => router.push("/dashboard/werehouse")}
          >
            {t("common.cancel")}
          </Button>
        </div>
      </form>
    </div>
  );
}
