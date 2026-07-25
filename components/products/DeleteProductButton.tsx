"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { softDeleteWithUndo } from "@/lib/delete/withUndo";

type Props = {
  id: string;
  name?: string;
};

export default function DeleteProductButton({ id, name }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      const result = await softDeleteWithUndo({
        deleteUrl: `/api/products/${id}`,
        restoreUrl: `/api/products/${id}/restore`,
        module: "products",
        title: "Product deleted",
        message: name
          ? `«${name}» — Undo for 30 seconds`
          : "Undo available for 30 seconds",
        entityType: "Product",
        entityId: id,
        onSoftDeleted: () => {
          setOpen(false);
          router.push("/dashboard/products");
          router.refresh();
        },
        onRestored: () => {
          router.push(`/dashboard/products/${id}`);
          router.refresh();
        },
      });
      if (!result.ok) return;
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-red-600 hover:text-red-700"
        aria-label="سڕینەوەی بەرهەم"
      >
        <Trash2 size={18} />
      </button>

      <ConfirmDialog
        open={open}
        title="سڕینەوەی بەرهەم"
        description={
          name
            ? `دڵنیایت لە سڕینەوەی «${name}»؟ Soft delete دەبێت — Undo بۆ چەند چرکەیەک، مێژوو دەمێنێتەوە.`
            : "Soft delete دەبێت — Undo · مێژووی جوڵە هەرگیز ناسڕدرێتەوە."
        }
        confirmText={loading ? "سڕینەوە..." : "سڕینەوە"}
        loading={loading}
        onConfirm={() => void handleDelete()}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
