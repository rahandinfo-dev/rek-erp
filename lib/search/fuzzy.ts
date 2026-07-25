/** Typo-tolerant fuzzy helpers for Smart Search */

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) row[j] = j;
  for (let i = 1; i <= a.length; i++) {
    let prev = i - 1;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = tmp;
    }
  }
  return row[b.length];
}

/** Lightweight fuzzy score — higher is better. 0 = no match. */
export function fuzzyScore(query: string, text: string): number {
  const q = query.trim().toLowerCase();
  const t = text.toLowerCase();
  if (!q) return 1;
  if (t === q) return 1000;
  if (t.startsWith(q)) return 800 + Math.min(q.length, 50);
  if (t.includes(q)) return 500 + Math.min(q.length, 40);

  // Word-level typo tolerance (cemnt → cement)
  const words = t.split(/[^a-z0-9\u0600-\u06ff]+/i).filter(Boolean);
  for (const w of words) {
    if (w.length < 3 || q.length < 3) continue;
    const dist = levenshtein(q, w);
    const maxDist = q.length <= 4 ? 1 : q.length <= 7 ? 2 : 3;
    if (dist <= maxDist) {
      return 420 - dist * 40 + Math.min(q.length, 30);
    }
  }

  let ti = 0;
  let score = 0;
  let streak = 0;
  for (let qi = 0; qi < q.length; qi++) {
    const ch = q[qi];
    let found = false;
    while (ti < t.length) {
      if (t[ti] === ch) {
        streak += 1;
        score += 10 + streak * 4;
        ti += 1;
        found = true;
        break;
      }
      streak = 0;
      ti += 1;
    }
    if (!found) return 0;
  }
  return score;
}

export function fuzzyMatchFields(
  query: string,
  fields: Array<string | null | undefined>
): number {
  const q = query.trim();
  if (!q) return 1;
  return Math.max(0, ...fields.map((f) => (f ? fuzzyScore(q, f) : 0)));
}

/** Generate a few typo / partial variants for DB OR contains */
export function queryVariants(query: string): string[] {
  const q = query.trim();
  if (q.length < 3) return [q];
  const set = new Set<string>([q]);
  // drop one char
  for (let i = 0; i < q.length && set.size < 8; i++) {
    set.add(q.slice(0, i) + q.slice(i + 1));
  }
  // adjacent swap
  for (let i = 0; i < q.length - 1 && set.size < 12; i++) {
    const chars = q.split("");
    [chars[i], chars[i + 1]] = [chars[i + 1], chars[i]];
    set.add(chars.join(""));
  }
  return [...set].filter((s) => s.length >= 2).slice(0, 10);
}
