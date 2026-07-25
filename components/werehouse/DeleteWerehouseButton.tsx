"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { appToast } from "@/lib/toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { softDeleteWithUndo } from "@/lib/delete/withUndo";

type Props = {
  id: string;
  name: string;
  isMain: boolean;
};

export default function DeleteWerehouseButton({ id, name, isMain }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);

  const deleteWarehouse = async () => {
    if (isMain) {
      appToast.error("ناتوانیت کۆگای سەرەکی بسڕیتەوە.");
      return;
    }

    try {
      setLoading(true);
      await softDeleteWithUndo({
        deleteUrl: `/api/werehouses/${id}`,
        restoreUrl: `/api/werehouses/${id}/restore`,
        module: "warehouses",
        title: "Warehouse deleted",
        message: name ? `«${name}» — Undo for 30 seconds` : undefined,
        entityType: "Warehouse",
        entityId: id,
        onSoftDeleted: () => {
          setHidden(true);
          setOpen(false);
          router.refresh();
        },
        onRestored: () => {
          setHidden(false);
          router.refresh();
        },
      });
    } finally {
      setLoading(false);
    }
  };

  if (hidden) {
    return (
      <span className="inline-block size-10 opacity-0 transition-opacity duration-300" />
    );
  }

  return (
    <>
      <button
        type="button"
        disabled={loading}
        onClick={() => setOpen(true)}
        aria-label={`سڕینەوەی ${name}`}
        className="flex size-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive transition hover:bg-destructive/15 disabled:opacity-50"
      >
        <Trash2 size={18} aria-hidden />
      </button>

      <ConfirmDialog
        open={open}
        loading={loading}
        title="سڕینەوەی کۆگا"
        description={`دڵنیایت دەتەوێت "${name}" بسڕیتەوە؟`}
        onCancel={() => setOpen(false)}
        onConfirm={async () => {
          await deleteWarehouse();
        }}
      />
    </>
  );
}
