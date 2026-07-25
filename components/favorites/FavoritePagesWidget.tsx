"use client";

import Link from "next/link";
import { Pin, Star } from "lucide-react";
import { displayName, useFavorites } from "@/lib/favorites/provider";
import { FAVORITE_COLOR_CLASS } from "@/lib/favorites/types";
import { cn } from "@/lib/utils";

export default function FavoritePagesWidget() {
  const { activeItems } = useFavorites();
  const top = [...activeItems]
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return a.sortOrder - b.sortOrder;
    })
    .slice(0, 8);

  return (
    <section aria-label="Favorite Pages" className="rek-card overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <Star size={18} className="fill-amber-400 text-amber-500" aria-hidden />
          <h2 className="text-lg font-black text-foreground">Favorite Pages</h2>
        </div>
        <span className="text-xs font-bold text-muted-foreground">
          {top.length} / 8
        </span>
      </div>

      {top.length === 0 ? (
        <p className="px-5 py-8 text-sm text-muted-foreground">
          Star pages and records to pin them here for one-click access.
        </p>
      ) : (
        <ul className="grid gap-0 sm:grid-cols-2">
          {top.map((item) => (
            <li key={item.href} className="border-b border-border sm:odd:border-e">
              <Link
                href={item.href}
                className="flex items-center gap-2.5 px-5 py-3.5 transition hover:bg-muted/50"
              >
                {item.color ? (
                  <span
                    className={cn(
                      "size-2.5 shrink-0 rounded-full",
                      FAVORITE_COLOR_CLASS[item.color]
                    )}
                  />
                ) : (
                  <Star size={14} className="shrink-0 text-amber-500" />
                )}
                <span className="min-w-0 flex-1 truncate text-sm font-bold text-foreground">
                  {displayName(item)}
                </span>
                {item.pinned ? (
                  <Pin size={12} className="shrink-0 text-primary" aria-hidden />
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
