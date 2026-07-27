"use client";

import { useState } from "react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { softDeleteWithUndo } from "@/lib/delete/withUndo";
import { useT } from "@/components/i18n/LocaleProvider";

type Props = {
  id: string;
  onDeleted: () => void;
  name?: string;
};

export default function DeleteBrandButton({ id, onDeleted, name }: Props) {
  const { t } = useT();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleDelete() {
    try {
      setLoading(true);
      await softDeleteWithUndo({
        deleteUrl: `/api/brands/${id}`,
        restoreUrl: `/api/brands/${id}/restore`,
        module: "brands",
        title: t("brands.deletedTitle"),
        message: name ? t("brands.deletedMessage", { name }) : undefined,
        entityType: t("brands.entityType"),
        entityId: id,
        onSoftDeleted: () => {
          setOpen(false);
          onDeleted();
        },
        onRestored: () => onDeleted(),
      });
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
        className="rounded-xl bg-destructive px-4 py-2 text-sm font-bold text-white transition hover:brightness-95 disabled:opacity-50"
      >
        {loading ? t("common.wait") : t("common.delete")}
      </button>

      <ConfirmDialog
        open={open}
        loading={loading}
        title={t("brands.deleteTitle")}
        description={t("brands.deleteConfirm")}
        onCancel={() => setOpen(false)}
        onConfirm={async () => {
          await handleDelete();
        }}
      />
    </>
  );
}
