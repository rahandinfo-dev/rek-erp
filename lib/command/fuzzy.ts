import { fuzzyScore } from "@/lib/search/fuzzy";

export { fuzzyScore } from "@/lib/search/fuzzy";

export function fuzzyMatchCommand(
  query: string,
  item: { title: string; subtitle?: string; keywords: string[] }
): number {
  const q = query.trim();
  if (!q) return 1;

  const scores = [
    fuzzyScore(q, item.title),
    item.subtitle ? fuzzyScore(q, item.subtitle) : 0,
    ...item.keywords.map((k) => fuzzyScore(q, k)),
  ];
  return Math.max(...scores);
}
