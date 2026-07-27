"use client";

import { Star } from "lucide-react";
import { usePathname } from "next/navigation";
import { useFavorites } from "@/lib/favorites/provider";
import { moduleFromPath } from "@/lib/history/types";
import { cn } from "@/lib/utils";
import { useT } from "@/components/i18n/LocaleProvider";

type Props = {
  href?: string;
  title?: string;
  moduleKey?: string;
  entityType?: string | null;
  entityId?: string | null;
  className?: string;
  /** Compact icon-only */
  iconOnly?: boolean;
};

/**
 * Star toggle — add/remove current page or a specific record from favorites.
 */
export default function FavoriteStarButton({
  href,
  title,
  moduleKey,
  entityType,
  entityId,
  className = "",
  iconOnly = false,
}: Props) {
  const { t } = useT();
  const pathname = usePathname() || "/dashboard";
  const targetHref = href || pathname;
  const { isFavorite, toggleFavorite } = useFavorites();
  const active = isFavorite(targetHref);

  function onClick() {
    const label =
      title ||
      document.querySelector("h1")?.textContent?.trim() ||
      targetHref;
    toggleFavorite({
      href: targetHref,
      title: label,
      moduleKey: moduleKey || moduleFromPath(targetHref),
      entityType: entityType ?? null,
      entityId: entityId ?? null,
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={active ? t("favorites.removeFrom") : t("favorites.add")}
      title={active ? t("favorites.removeFrom") : t("favorites.add")}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3 text-sm font-bold transition hover:bg-muted",
        active && "border-amber-300 bg-amber-50 text-amber-700",
        iconOnly && "size-10 px-0",
        className
      )}
    >
      <Star
        size={16}
        className={cn(active && "fill-amber-400 text-amber-500")}
        aria-hidden
      />
      {!iconOnly ? (
        <span>{active ? t("favorites.favorited") : t("favorites.favorite")}</span>
      ) : null}
    </button>
  );
}
