"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  supplierSchema,
  SupplierFormData,
} from "@/lib/validators/supplier";
import { useFormDraft } from "@/lib/hooks/useFormDraft";
import { DRAFT_KEYS } from "@/lib/drafts/types";
import { AutoSaveBar, AutoSaveStatus } from "@/components/ui/AutoSaveStatus";
import { appToast } from "@/lib/toast";
import ImageUpload from "@/components/uploads/ImageUpload";
import { useT } from "@/components/i18n/LocaleProvider";

type Props = {
  id: string;
};

export default function EditSupplierForm({ id }: Props) {
  const { t } = useT();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState("");
  const [hydrated, setHydrated] = useState(false);

  const [form, setForm] = useState<SupplierFormData>({
    name: "",
    code: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
    image: "",
    active: true,
  });

  const {
    status: draftStatus,
    savedAt: draftSavedAt,
    hasPendingDraft,
    pendingDraft,
    restoreDraft,
    discardDraft,
    clearDraft,
  } = useFormDraft({
    key: `${DRAFT_KEYS.supplierEdit}:${id}`,
    value: form,
    enabled: hydrated,
    isEmpty: () => false,
  });

  useEffect(() => {
    async function loadSupplier() {
      try {
        const res = await fetch(`/api/suppliers/${id}`);
        const result = await res.json();

        if (result.success) {
          setForm({
            name: result.data.name ?? "",
            code: result.data.code ?? "",
            phone: result.data.phone ?? "",
            email: result.data.email ?? "",
            address: result.data.address ?? "",
            notes: result.data.notes ?? "",
            image: result.data.image ?? "",
            active: result.data.active,
          });
          setHydrated(true);
        } else {
          setServerError(result.message);
        }
      } catch (error) {
        console.error(error);
        setServerError(t("errors.generic"));
      } finally {
        setLoading(false);
      }
    }

    void loadSupplier();
  }, [id, t]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value, type } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : value,
    }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      setSaving(true);
      setServerError("");

      const validation = supplierSchema.safeParse(form);

      if (!validation.success) {
        setServerError(t("suppliers.validationError"));
        return;
      }

      const res = await fetch(`/api/suppliers/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validation.data),
      });

      const result = await res.json();

      if (!res.ok) {
        setServerError(result.message || t("errors.generic"));
        return;
      }

      clearDraft();
      appToast.success(t("suppliers.updated"));
      router.push("/dashboard/suppliers");
      router.refresh();
    } catch (error) {
      console.error(error);
      setServerError(t("errors.generic"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-slate-500">{t("common.pleaseWait")}</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-3xl bg-white p-8 shadow"
    >
      <AutoSaveBar
        status={draftStatus}
        savedAt={draftSavedAt}
        hasPendingDraft={hasPendingDraft}
        pendingSavedAt={pendingDraft?.savedAt}
        onRestore={() => {
          const data = restoreDraft();
          if (data) setForm(data);
        }}
        onDiscard={discardDraft}
      />

      <ImageUpload
        kind="supplier"
        value={form.image || null}
        onChange={(url) =>
          setForm((prev) => ({ ...prev, image: url || "" }))
        }
        label={t("suppliers.imageLabel")}
        shape="circle"
      />

      <div>
        <label className="mb-2 block font-bold">{t("suppliers.nameLabel")}</label>
        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          className="w-full rounded-xl border p-3"
        />
      </div>

      <div>
        <label className="mb-2 block font-bold">{t("common.code")}</label>
        <input
          name="code"
          value={form.code}
          onChange={handleChange}
          className="w-full rounded-xl border p-3"
        />
      </div>

      <div>
        <label className="mb-2 block font-bold">{t("suppliers.phoneLabel")}</label>
        <input
          name="phone"
          value={form.phone}
          onChange={handleChange}
          className="w-full rounded-xl border p-3"
        />
      </div>

      <div>
        <label className="mb-2 block font-bold">{t("common.email")}</label>
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          className="w-full rounded-xl border p-3"
        />
      </div>

      <div>
        <label className="mb-2 block font-bold">{t("common.address")}</label>
        <textarea
          name="address"
          rows={3}
          value={form.address}
          onChange={handleChange}
          className="w-full rounded-xl border p-3"
        />
      </div>

      <div>
        <label className="mb-2 block font-bold">{t("common.notes")}</label>
        <textarea
          name="notes"
          rows={4}
          value={form.notes}
          onChange={handleChange}
          className="w-full rounded-xl border p-3"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          name="active"
          checked={form.active}
          onChange={handleChange}
        />
        <span>{t("common.active")}</span>
      </div>

      {serverError && (
        <div className="rounded-xl bg-red-100 p-3 text-red-700">
          {serverError}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <AutoSaveStatus status={draftStatus} savedAt={draftSavedAt} />
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-[#FFAE42] px-6 py-3 font-bold text-white transition hover:bg-[#E8942A] disabled:opacity-50"
        >
          {saving ? t("common.pleaseWait") : t("suppliers.update")}
        </button>
      </div>
    </form>
  );
}
