"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { softDeleteWithUndo } from "@/lib/delete/withUndo";

type Props = {
  id: string;
  name?: string;
  onDeleted: () => void;
  onRestored?: () => void;
};

export default function DeleteCustomerButton({
  id,
  name,
  onDeleted,
  onRestored,
}: Props) {
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm("Soft delete بکە؟ Undo بۆ چەند چرکەیەک دەردەکەوێت · مێژوو دەمێنێتەوە.")) {
      return;
    }

    try {
      setLoading(true);
      await softDeleteWithUndo({
        deleteUrl: `/api/customers/${id}`,
        restoreUrl: `/api/customers/${id}/restore`,
        module: "customers",
        title: "Customer archived",
        message: name ? `«${name}»` : undefined,
        entityType: "Customer",
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
      aria-label="سڕینەوەی کڕیار"
    >
      <Trash2 size={18} />
    </button>
  );
}
