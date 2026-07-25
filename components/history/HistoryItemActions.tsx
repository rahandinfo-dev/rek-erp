"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Copy,
  ExternalLink,
  MoreHorizontal,
  Pin,
  PinOff,
  Share2,
  Star,
  Trash2,
} from "lucide-react";
import { useNavigationHistory } from "@/lib/history/provider";
import { useFavorites } from "@/lib/favorites/provider";
import type { HistoryItem } from "@/lib/history/types";
import { appToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

export default function HistoryItemActions({
  item,
  className = "",
}: {
  item: HistoryItem;
  className?: string;
}) {
  const { remove, togglePin } = useNavigationHistory();
  const favorites = useFavorites();
  const [open, setOpen] = useState(false);
  const isFav = favorites.isFavorite(item.href);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}${item.href}`
      );
      appToast.success("Link copied");
    } catch {
      appToast.error("Copy failed");
    }
    setOpen(false);
  }

  async function share() {
    const url = `${window.location.origin}${item.href}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: item.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        appToast.success("Link ready to share");
      }
    } catch {
      /* user cancelled */
    }
    setOpen(false);
  }

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        className="rounded-lg bg-card p-1.5 text-muted-foreground shadow-sm ring-1 ring-border hover:text-foreground"
        aria-label="History actions"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <MoreHorizontal size={14} />
      </button>
      {open ? (
        <div className="absolute top-8 end-0 z-50 min-w-[170px] rounded-xl border border-border bg-card p-1 shadow-lg">
          <Link
            href={item.href}
            className="block rounded-lg px-2 py-1.5 text-xs font-semibold hover:bg-muted"
            onClick={() => setOpen(false)}
          >
            Open
          </Link>
          <a
            href={item.href}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold hover:bg-muted"
            onClick={() => setOpen(false)}
          >
            <ExternalLink size={12} /> Open in New Tab
          </a>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold hover:bg-muted"
            onClick={() => {
              favorites.toggleFavorite({
                href: item.href,
                title: item.title,
                moduleKey: item.moduleKey,
                entityType: item.entityType,
                entityId: item.entityId,
              });
              setOpen(false);
            }}
          >
            <Star
              size={12}
              className={isFav ? "fill-amber-400 text-amber-500" : ""}
            />
            {isFav ? "Unfavorite" : "Favorite"}
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold hover:bg-muted"
            onClick={() => {
              void togglePin(item.href);
              setOpen(false);
            }}
          >
            {item.pinned ? <PinOff size={12} /> : <Pin size={12} />}
            {item.pinned ? "Unpin" : "Pin"}
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold hover:bg-muted"
            onClick={() => void copyLink()}
          >
            <Copy size={12} /> Copy Link
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold hover:bg-muted"
            onClick={() => void share()}
          >
            <Share2 size={12} /> Share
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10"
            onClick={() => {
              void remove(item.href);
              setOpen(false);
            }}
          >
            <Trash2 size={12} /> Remove
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function HistoryActionBadge({
  action,
}: {
  action: HistoryItem["action"];
}) {
  if (action === "viewed") return null;
  const map: Record<
    Exclude<HistoryItem["action"], "viewed">,
    { label: string; className: string }
  > = {
    edited: {
      label: "Edited",
      className: "bg-amber-100 text-amber-800",
    },
    created: {
      label: "New",
      className:
        "bg-[color-mix(in_srgb,var(--success)_18%,white)] text-[var(--success)]",
    },
    printed: {
      label: "Printed",
      className: "bg-sky-100 text-sky-800",
    },
    downloaded: {
      label: "Downloaded",
      className: "bg-violet-100 text-violet-800",
    },
  };
  const meta = map[action];
  return (
    <span
      className={cn(
        "rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide",
        meta.className
      )}
    >
      {meta.label}
    </span>
  );
}
