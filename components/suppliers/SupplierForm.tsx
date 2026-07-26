"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  supplierSchema,
  SupplierFormData,
} from "@/lib/validators/supplier";
import { appToast } from "@/lib/toast";
import { useFormDraft } from "@/lib/hooks/useFormDraft";
import { DRAFT_KEYS } from "@/lib/drafts/types";
import { AutoSaveBar, AutoSaveStatus } from "@/components/ui/AutoSaveStatus";
import ImageUpload from "@/components/uploads/ImageUpload";

function isSupplierDraftEmpty(v: SupplierFormData) {
  return (
    !v.name.trim() &&
    !(v.code || "").trim() &&
    !(v.phone || "").trim() &&
    !(v.email || "").trim() &&
    !(v.address || "").trim() &&
    !(v.notes || "").trim() &&
    !(v.image || "").trim()
  );
}

export default function SupplierForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    control,
    reset,
    getValues,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: "",
      code: "",
      phone: "",
      email: "",
      address: "",
      notes: "",
      image: "",
      active: true,
    },
  });

  const watched = useWatch({ control });
  const imageValue = useWatch({ control, name: "image" });

  const {
    status: draftStatus,
    savedAt: draftSavedAt,
    hasPendingDraft,
    pendingDraft,
    restoreDraft,
    discardDraft,
    clearDraft,
  } = useFormDraft({
    key: DRAFT_KEYS.supplierNew,
    value: (watched ?? getValues()) as SupplierFormData,
    isEmpty: isSupplierDraftEmpty,
  });

  async function onSubmit(data: SupplierFormData) {
    try {
      setServerError("");

      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        setServerError(result.message || "هەڵەیەک ڕوویدا.");
        appToast.error(result.message || "هەڵەیەک ڕوویدا.");
        return;
      }

      clearDraft();
      appToast.supplierAdded();
      router.push("/dashboard/suppliers");
      router.refresh();
    } catch {
      setServerError("هەڵەیەک ڕوویدا.");
      appToast.error("هەڵەیەک ڕوویدا.");
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6 rounded-3xl bg-white p-8 shadow"
    >
      <AutoSaveBar
        status={draftStatus}
        savedAt={draftSavedAt}
        hasPendingDraft={hasPendingDraft}
        pendingSavedAt={pendingDraft?.savedAt}
        onRestore={() => {
          const data = restoreDraft();
          if (data) reset(data);
        }}
        onDiscard={discardDraft}
      />

      <ImageUpload
        kind="supplier"
        value={imageValue || null}
        onChange={(url) => setValue("image", url || "", { shouldDirty: true })}
        label="وێنەی دابینکەر"
        shape="circle"
      />

      <div>
        <label className="mb-2 block font-bold">ناوی دابینکەر</label>
        <input {...register("name")} className="w-full rounded-xl border p-3" />
        {errors.name && (
          <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label className="mb-2 block font-bold">کۆد</label>
        <input {...register("code")} className="w-full rounded-xl border p-3" />
        {errors.code && (
          <p className="mt-1 text-sm text-red-500">{errors.code.message}</p>
        )}
      </div>

      <div>
        <label className="mb-2 block font-bold">ژمارەی مۆبایل</label>
        <input {...register("phone")} className="w-full rounded-xl border p-3" />
      </div>

      <div>
        <label className="mb-2 block font-bold">ئیمەیڵ</label>
        <input
          type="email"
          {...register("email")}
          className="w-full rounded-xl border p-3"
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label className="mb-2 block font-bold">ناونیشان</label>
        <textarea
          {...register("address")}
          rows={3}
          className="w-full rounded-xl border p-3"
        />
      </div>

      <div>
        <label className="mb-2 block font-bold">تێبینی</label>
        <textarea
          {...register("notes")}
          rows={4}
          className="w-full rounded-xl border p-3"
        />
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" {...register("active")} />
        <span>چالاک</span>
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
          disabled={isSubmitting}
          className="rounded-xl bg-[#FFAE42] px-6 py-3 font-bold text-white disabled:opacity-50"
        >
          {isSubmitting ? "چاوەڕێ بکە..." : "زیادکردنی دابینکەر"}
        </button>
      </div>
    </form>
  );
}
