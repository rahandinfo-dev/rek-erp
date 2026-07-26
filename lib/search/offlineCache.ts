import type { SearchHit } from "@/lib/search/types";
import { fuzzyMatchFields } from "@/lib/search/fuzzy";

const PREFIX = "rek-search-index:v1:";

export type OfflineSearchIndex = {
  userId: string;
  companyId: string;
  updatedAt: number;
  items: SearchHit[];
};

function key(userId: string) {
  return `${PREFIX}${userId}`;
}

export function readOfflineIndex(userId: string): OfflineSearchIndex | null {
  if (typeof window === "undefined" || !userId) return null;
  try {
    const raw = localStorage.getItem(key(userId));
    if (!raw) return null;
    return JSON.parse(raw) as OfflineSearchIndex;
  } catch {
    return null;
  }
}

export function writeOfflineIndex(index: OfflineSearchIndex) {
  if (typeof window === "undefined") return;
  try {
    // Cap payload size
    const items = index.items.slice(0, 800);
    localStorage.setItem(
      key(index.userId),
      JSON.stringify({ ...index, items })
    );
  } catch {
    /* quota */
  }
}

export function searchOfflineIndex(
  userId: string,
  query: string,
  typeFilter?: string
): SearchHit[] {
  const index = readOfflineIndex(userId);
  if (!index?.items?.length) return [];
  const q = query.trim();
  if (!q) return [];

  return index.items
    .map((item) => ({
      item,
      score: fuzzyMatchFields(q, [
        item.title,
        item.subtitle,
        item.description,
        item.module,
        item.type,
      ]),
    }))
    .filter((x) => {
      if (x.score <= 0) return false;
      if (!typeFilter || typeFilter === "all") return true;
      return (
        x.item.type === typeFilter ||
        x.item.module.toLowerCase() === typeFilter ||
        (typeFilter === "products" &&
          ["product", "sku", "barcode"].includes(x.item.type)) ||
        (typeFilter === "reports" && x.item.type === "reports") ||
        (typeFilter === "settings" &&
          (x.item.type === "settings" || x.item.module === "ڕێکخستنەکان"))
      );
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 40)
    .map((x) => x.item);
}
