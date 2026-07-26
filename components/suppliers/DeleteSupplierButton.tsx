"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { softDeleteWithUndo } from "@/lib/delete/withUndo";

type Props = {
  id: string;
  name?: string;
  onDeleted?: () => void;
  onRestored?: () => void;
};

export default function DeleteSupplierButton({
  id,
  name,
  onDeleted,
  onRestored,
}: Props) {
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    const ok = window.confirm(
      "Soft delete بکە؟ Undo بۆ چەند چرکەیەک دەردەکەوێت · مێژوو دەمێنێتەوە."
    );
    if (!ok) return;

    try {
      setLoading(true);
      await softDeleteWithUndo({
        deleteUrl: `/api/suppliers/${id}`,
        restoreUrl: `/api/suppliers/${id}/restore`,
        module: "suppliers",
        title: "Supplier archived",
        message: name ? `«${name}»` : undefined,
        entityType: "دابینکەر",
        entityId: id,
        onSoftDeleted: onDeleted,
        onRestored,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleDelete()}
      disabled={loading}
      className="text-red-600 hover:text-red-800 disabled:opacity-50"
      aria-label="سڕینەوەی دابینکەر"
    >
      <Trash2 size={18} />
    </button>
  );
}
