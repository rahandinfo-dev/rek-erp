"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { appToast } from "@/lib/toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { softDeleteWithUndo } from "@/lib/delete/withUndo";
import { useT } from "@/components/i18n/LocaleProvider";

type Props = {
  id: string;
  name: string;
  isMain: boolean;
};

export default function DeleteWerehouseButton({ id, name, isMain }: Props) {
  const { t } = useT();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);

  const deleteWarehouse = async () => {
    if (isMain) {
      appToast.error(t("warehouses.cannotDeleteMain"));
      return;
    }

    try {
      setLoading(true);
      await softDeleteWithUndo({
        deleteUrl: `/api/werehouses/${id}`,
        restoreUrl: `/api/werehouses/${id}/restore`,
        module: "warehouses",
        title: t("warehouses.deletedTitle"),
        message: name
          ? t("warehouses.deletedMessage", { name })
          : undefined,
        entityType: t("warehouses.entityType"),
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
        aria-label={t("warehouses.deleteAria", { name })}
        className="flex size-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive transition hover:bg-destructive/15 disabled:opacity-50"
      >
        <Trash2 size={18} aria-hidden />
      </button>

      <ConfirmDialog
        open={open}
        loading={loading}
        title={t("warehouses.deleteTitle")}
        description={t("warehouses.deleteConfirm", { name })}
        onCancel={() => setOpen(false)}
        onConfirm={async () => {
          await deleteWarehouse();
        }}
      />
    </>
  );
}
