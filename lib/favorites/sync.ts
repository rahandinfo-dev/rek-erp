"use client";

import type { FavoritesBundle } from "@/lib/favorites/types";

export async function fetchFavoritesBundle(): Promise<FavoritesBundle | null> {
  try {
    if (typeof navigator !== "undefined" && !navigator.onLine) return null;
    const res = await fetch("/api/favorites", { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.success || !json.data) return null;
    return json.data as FavoritesBundle;
  } catch {
    return null;
  }
}

export async function syncFavoritesBundle(
  bundle: FavoritesBundle
): Promise<FavoritesBundle | null> {
  try {
    if (typeof navigator !== "undefined" && !navigator.onLine) return null;
    const res = await fetch("/api/favorites", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bundle),
      keepalive: true,
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.success || !json.data) return null;
    return json.data as FavoritesBundle;
  } catch {
    return null;
  }
}

export async function bootstrapFavorites(): Promise<FavoritesBundle | null> {
  try {
    const res = await fetch("/api/favorites/bootstrap", {
      method: "POST",
      keepalive: true,
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.success || !json.data) return null;
    return json.data as FavoritesBundle;
  } catch {
    return null;
  }
}
