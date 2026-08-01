"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { appToast } from "@/lib/toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function DeleteTemplateButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function onDelete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/invoice-templates/${id}`, {
        method: "DELETE",
      });
      const result = await res.json();
      if (!res.ok) {
        appToast.error(result.message || "هەڵەیەک ڕوویدا.");
        return;
      }
      appToast.success("قاڵب سڕایەوە.");
      setOpen(false);
      router.refresh();
    } catch {
      appToast.error("هەڵەیەک ڕوویدا.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={loading}
        aria-label="سڕینەوەی قاڵب"
        className="inline-flex size-11 items-center justify-center rounded-2xl border border-destructive/30 text-destructive transition hover:bg-destructive/10 disabled:opacity-50"
      >
        <Trash2 size={16} aria-hidden />
      </button>

      <ConfirmDialog
        open={open}
        loading={loading}
        title="سڕینەوەی قاڵب"
        description="دڵنیایت لە سڕینەوەی ئەم قاڵبە؟"
        onCancel={() => setOpen(false)}
        onConfirm={async () => {
          await onDelete();
        }}
      />
    </>
  );
}
