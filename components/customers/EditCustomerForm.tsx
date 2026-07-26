"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  customerSchema,
  CustomerFormData,
} from "@/lib/validators/customer";
import { useFormDraft } from "@/lib/hooks/useFormDraft";
import { DRAFT_KEYS } from "@/lib/drafts/types";
import { AutoSaveBar, AutoSaveStatus } from "@/components/ui/AutoSaveStatus";
import { appToast } from "@/lib/toast";
import ImageUpload from "@/components/uploads/ImageUpload";

type Props = { id: string };

export default function EditCustomerForm({ id }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [serverError, setServerError] = useState("");
  const [hydrated, setHydrated] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    getValues,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
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
    key: `${DRAFT_KEYS.customerEdit}:${id}`,
    value: (watched ?? getValues()) as CustomerFormData,
    enabled: hydrated,
    isEmpty: () => false,
  });

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/customers/${id}`);
        const result = await res.json();

        if (!result.success) {
          setServerError(result.message);
          return;
        }

        reset({
          name: result.data.name,
          code: result.data.code,
          phone: result.data.phone ?? "",
          email: result.data.email ?? "",
          address: result.data.address ?? "",
          notes: result.data.notes ?? "",
          image: result.data.image ?? "",
          active: result.data.active,
        });
        setHydrated(true);
      } catch {
        setServerError("هەڵەیەک ڕوویدا.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [id, reset]);

  async function onSubmit(data: CustomerFormData) {
    try {
      setServerError("");

      const res = await fetch(`/api/customers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        setServerError(result.message || "هەڵەیەک ڕوویدا.");
        appToast.error(result.message || "هەڵەیەک ڕوویدا.");
        return;
      }

      clearDraft();
      appToast.success("کڕیار نوێکرایەوە.");
      router.push("/dashboard/customers");
      router.refresh();
    } catch {
      setServerError("هەڵەیەک ڕوویدا.");
    }
  }

  if (loading) {
    return (
      <div className="rounded-3xl bg-white p-8 text-center text-slate-500">
        چاوەڕێ بکە...
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6 rounded-3xl bg-white p-4 shadow sm:p-8"
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

      {serverError && (
        <p className="rounded-xl bg-red-50 p-3 text-red-600">{serverError}</p>
      )}

      <ImageUpload
        kind="customer"
        value={imageValue || null}
        onChange={(url) => setValue("image", url || "", { shouldDirty: true })}
        label="وێنەی کڕیار"
        shape="circle"
      />

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label className="mb-2 block font-bold">ناوی کڕیار</label>
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
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label className="mb-2 block font-bold">مۆبایل</label>
          <input {...register("phone")} className="w-full rounded-xl border p-3" />
        </div>

        <div>
          <label className="mb-2 block font-bold">ئیمەیڵ</label>
          <input {...register("email")} className="w-full rounded-xl border p-3" />
        </div>
      </div>

      <div>
        <label className="mb-2 block font-bold">ناونیشان</label>
        <input {...register("address")} className="w-full rounded-xl border p-3" />
      </div>

      <div>
        <label className="mb-2 block font-bold">تێبینی</label>
        <textarea
          {...register("notes")}
          rows={3}
          className="w-full rounded-xl border p-3"
        />
      </div>

      <div className="flex items-center gap-3">
        <input id="active" type="checkbox" {...register("active")} />
        <label htmlFor="active">کڕیار چالاک بێت</label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <AutoSaveStatus status={draftStatus} savedAt={draftSavedAt} />
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-2xl bg-[#FFAE42] px-6 py-3 font-bold text-white disabled:opacity-50"
        >
          {isSubmitting ? "چاوەڕێ بکە..." : "پاشەکەوتکردن"}
        </button>
      </div>
    </form>
  );
}
