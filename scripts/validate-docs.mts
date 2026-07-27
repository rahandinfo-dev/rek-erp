import { ALL_DOC_MODULES } from "../lib/docs/catalog.ts";
import { OFFICIAL_DOC_SLUGS } from "../lib/docs/official.ts";
import { DOC_SECTION_ORDER } from "../lib/docs/types.ts";

const slugs = ALL_DOC_MODULES.map((m) => m.slug);
const missing = OFFICIAL_DOC_SLUGS.filter((s) => !slugs.includes(s));
const extra = slugs.filter(
  (s) => !(OFFICIAL_DOC_SLUGS as readonly string[]).includes(s)
);
console.log("count", ALL_DOC_MODULES.length);
console.log("missing", missing);
console.log("extra", extra);
let empty = 0;
let short = 0;
for (const m of ALL_DOC_MODULES) {
  for (const key of DOC_SECTION_ORDER) {
    const body = m.sections[key]?.body ?? [];
    const len = body.join("").trim().length;
    if (!body.length || len === 0) {
      empty++;
      console.log("EMPTY", m.slug, key);
    } else if (len < 40) {
      short++;
      console.log("SHORT", m.slug, key, len);
    }
  }
}
console.log("empty sections", empty, "short sections", short);
console.log(
  "titles",
  ALL_DOC_MODULES.map((m) => `${m.slug}: ${m.title}`).join("\n")
);
