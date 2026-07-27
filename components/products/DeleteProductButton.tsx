"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { softDeleteWithUndo } from "@/lib/delete/withUndo";
import { useT } from "@/components/i18n/LocaleProvider";

type Props = {
  id: string;
  name?: string;
};

export default function DeleteProductButton({ id, name }: Props) {
  const { t } = useT();
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
        title: t("products.deletedTitle"),
        message: name
          ? t("products.deletedMessageNamed", { name })
          : t("products.deletedMessage"),
        entityType: t("products.entityType"),
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
        aria-label={t("products.deleteAria")}
      >
        <Trash2 size={18} />
      </button>

      <ConfirmDialog
        open={open}
        title={t("products.deleteTitle")}
        description={
          name
            ? t("products.softDeleteDescNamed", { name })
            : t("products.softDeleteDesc")
        }
        confirmText={loading ? t("products.deleting") : t("common.delete")}
        loading={loading}
        onConfirm={() => void handleDelete()}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
