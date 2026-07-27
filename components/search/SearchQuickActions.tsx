"use client";

import {
  Copy,
  ExternalLink,
  Pencil,
  Star,
  Trash2,
  Files,
} from "lucide-react";
import type { CommandItem } from "@/lib/command/types";
import { appToast } from "@/lib/toast";
import { useT } from "@/components/i18n/LocaleProvider";

type Props = {
  item: CommandItem;
  onOpen: () => void;
  onEdit: () => void;
  onFavorite: () => void;
  onDelete?: () => void;
  onClose: () => void;
  isFavorite: boolean;
};

export default function SearchQuickActions({
  item,
  onOpen,
  onEdit,
  onFavorite,
  onDelete,
  onClose,
  isFavorite,
}: Props) {
  const { t } = useT();
  async function copyLink() {
    if (!item.href) return;
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}${item.href}`
      );
      appToast.success("بەستەر کۆپی کرا");
    } catch {
      appToast.error("کۆپیکردن سەرنەکەوت");
    }
    onClose();
  }

  function openNewTab() {
    if (!item.href) return;
    window.open(item.href, "_blank", "noopener,noreferrer");
    onClose();
  }

  function duplicate() {
    if (!item.href) return;
    const base = item.editHref || item.href;
    const url = base.includes("/new")
      ? base
      : `${base.split("/").slice(0, -1).join("/")}/new?clone=${item.entityId || item.id.replace(/^result-/, "")}`;
    window.open(url.startsWith("/") ? url : item.href, "_self");
    onClose();
  }

  return (
    <div className="absolute end-2 top-8 z-50 min-w-[160px] rounded-xl border border-border bg-card p-1 shadow-lg">
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold hover:bg-muted"
        onClick={onOpen}
      >
        {t("common.view")}
      </button>
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold hover:bg-muted"
        onClick={openNewTab}
      >
        <ExternalLink size={12} /> کردنەوە لە تابێکی نوێ
      </button>
      {item.editHref ? (
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold hover:bg-muted"
          onClick={onEdit}
        >
          <Pencil size={12} /> {t("common.edit")}
        </button>
      ) : null}
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold hover:bg-muted"
        onClick={duplicate}
      >
        <Files size={12} /> {t("common.duplicate")}
      </button>
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold hover:bg-muted"
        onClick={onFavorite}
      >
        <Star size={12} className={isFavorite ? "fill-amber-400 text-amber-500" : ""} />{" "}
        {isFavorite ? "لابردن لە دڵخواز" : "دڵخواز"}
      </button>
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold hover:bg-muted"
        onClick={() => void copyLink()}
      >
        <Copy size={12} /> {t("recycle.copyLink")}
      </button>
      {onDelete ? (
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10"
          onClick={onDelete}
        >
          <Trash2 size={12} /> {t("search.delete")}
        </button>
      ) : null}
    </div>
  );
}
