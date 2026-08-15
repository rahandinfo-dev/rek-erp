"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { softDeleteWithUndo } from "@/lib/delete/withUndo";
import { useT } from "@/components/i18n/LocaleProvider";
import { useConfirmation } from "@/components/ui/ConfirmationProvider";

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
  const { t } = useT();
  const confirmAction = useConfirmation();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    const accepted = await confirmAction({
      title: t("common.confirm"),
      description: t("common.softDeleteConfirm"),
      confirmText: t("common.delete"),
    });
    if (!accepted) return;

    try {
      setLoading(true);
      await softDeleteWithUndo({
        deleteUrl: `/api/customers/${id}`,
        restoreUrl: `/api/customers/${id}/restore`,
        module: "customers",
        title: t("customers.archivedTitle"),
        message: name ? `«${name}»` : undefined,
        entityType: t("customers.entityType"),
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
      aria-label={t("customers.deleteAria")}
    >
      <Trash2 size={18} />
    </button>
  );
}
