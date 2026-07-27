"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { softDeleteWithUndo } from "@/lib/delete/withUndo";
import { useT } from "@/components/i18n/LocaleProvider";

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
  const { t } = useT();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    const ok = window.confirm(t("common.softDeleteConfirm"));
    if (!ok) return;

    try {
      setLoading(true);
      await softDeleteWithUndo({
        deleteUrl: `/api/suppliers/${id}`,
        restoreUrl: `/api/suppliers/${id}/restore`,
        module: "suppliers",
        title: t("suppliers.archivedTitle"),
        message: name ? `«${name}»` : undefined,
        entityType: t("suppliers.entityType"),
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
      aria-label={t("suppliers.deleteAria")}
    >
      <Trash2 size={18} />
    </button>
  );
}
