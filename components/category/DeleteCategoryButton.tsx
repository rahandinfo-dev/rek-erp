"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { softDeleteWithUndo } from "@/lib/delete/withUndo";

type Props = {
  id: string;
  name: string;
};

export default function DeleteCategoryButton({ id, name }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function deleteCategory() {
    try {
      setLoading(true);
      await softDeleteWithUndo({
        deleteUrl: `/api/categories/${id}`,
        restoreUrl: `/api/categories/${id}/restore`,
        module: "categories",
        title: "Category deleted",
        message: `«${name}»`,
        entityType: "Category",
        entityId: id,
        onSoftDeleted: () => {
          setOpen(false);
          router.replace("/dashboard/category");
          router.refresh();
        },
        onRestored: () => {
          router.refresh();
        },
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={loading}
        onClick={() => setOpen(true)}
        aria-label={`سڕینەوەی ${name}`}
        className="rounded-xl p-2 text-destructive transition hover:bg-destructive/10"
      >
        <Trash2 size={18} aria-hidden />
      </button>

      <ConfirmDialog
        open={open}
        loading={loading}
        title="سڕینەوەی پۆل"
        description={`دڵنیایت لە سڕینەوەی "${name}"؟`}
        onCancel={() => setOpen(false)}
        onConfirm={async () => {
          await deleteCategory();
        }}
      />
    </>
  );
}
