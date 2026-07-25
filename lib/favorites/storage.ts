"use client";

import {
  FAVORITES_PREFIX,
  FAVORITES_UI_KEY,
  emptyBundle,
  type FavoritesBundle,
  type FavoritesUiState,
} from "@/lib/favorites/types";

function bundleKey(userId: string) {
  return `${FAVORITES_PREFIX}${userId}`;
}

function uiKey(userId: string) {
  return `${FAVORITES_UI_KEY}${userId}`;
}

export function readLocalFavorites(userId: string): FavoritesBundle | null {
  if (typeof window === "undefined" || !userId) return null;
  try {
    const raw = localStorage.getItem(bundleKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FavoritesBundle;
    if (!parsed || parsed.version !== 1 || parsed.userId !== userId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeLocalFavorites(bundle: FavoritesBundle) {
  if (typeof window === "undefined" || !bundle.userId) return;
  try {
    localStorage.setItem(
      bundleKey(bundle.userId),
      JSON.stringify({ ...bundle, updatedAt: Date.now() })
    );
  } catch {
    /* quota */
  }
}

export function readFavoritesUi(userId: string): FavoritesUiState {
  if (typeof window === "undefined" || !userId) {
    return { section: "favorites", collapsed: false };
  }
  try {
    const raw = localStorage.getItem(uiKey(userId));
    if (!raw) return { section: "favorites", collapsed: false };
    return JSON.parse(raw) as FavoritesUiState;
  } catch {
    return { section: "favorites", collapsed: false };
  }
}

export function writeFavoritesUi(userId: string, ui: FavoritesUiState) {
  if (typeof window === "undefined" || !userId) return;
  try {
    localStorage.setItem(uiKey(userId), JSON.stringify(ui));
  } catch {
    /* ignore */
  }
}

export function ensureLocalBundle(
  userId: string,
  companyId: string
): FavoritesBundle {
  return readLocalFavorites(userId) || emptyBundle(userId, companyId);
}
