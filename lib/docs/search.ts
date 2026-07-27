import type { DocModule } from "@/lib/docs/types";

function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/[ًٌٍَُِّْ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function moduleHaystack(mod: DocModule) {
  const sectionText = Object.values(mod.sections)
    .flatMap((s) => [s.title, ...s.body])
    .join(" ");
  return normalize(
    [
      mod.title,
      mod.shortDescription,
      mod.developmentNote || "",
      ...mod.keywords,
      sectionText,
    ].join(" ")
  );
}

export type DocSearchResult = {
  module: DocModule;
  score: number;
  matchedIn: "title" | "description" | "content";
};

export function searchDocModules(
  modules: DocModule[],
  query: string
): DocSearchResult[] {
  const q = normalize(query);
  if (!q) return [];

  const tokens = q.split(" ").filter(Boolean);
  if (tokens.length === 0) return [];

  const results: DocSearchResult[] = [];

  for (const mod of modules) {
    const title = normalize(mod.title);
    const desc = normalize(mod.shortDescription);
    const hay = moduleHaystack(mod);

    let score = 0;
    let matchedIn: DocSearchResult["matchedIn"] = "content";

    for (const token of tokens) {
      if (title.includes(token)) {
        score += 10;
        matchedIn = "title";
      } else if (desc.includes(token)) {
        score += 6;
        if (matchedIn === "content") matchedIn = "description";
      } else if (hay.includes(token)) {
        score += 2;
      }
    }

    if (score > 0) {
      results.push({ module: mod, score, matchedIn });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}
