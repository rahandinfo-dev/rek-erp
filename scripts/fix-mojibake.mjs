/**
 * Repair remaining Windows-1252 mojibake in TS/TSX string literals,
 * including template literals that contain ${expressions}.
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SKIP = new Set(["node_modules", ".next", "generated", ".git", "public", "scripts"]);

const CP1252_REV = new Map([
  [0x20ac, 0x80], [0x201a, 0x82], [0x0192, 0x83], [0x201e, 0x84],
  [0x2026, 0x85], [0x2020, 0x86], [0x2021, 0x87], [0x02c6, 0x88],
  [0x2030, 0x89], [0x0160, 0x8a], [0x2039, 0x8b], [0x0152, 0x8c],
  [0x017d, 0x8e], [0x2018, 0x91], [0x2019, 0x92], [0x201c, 0x93],
  [0x201d, 0x94], [0x2022, 0x95], [0x2013, 0x96], [0x2014, 0x97],
  [0x02dc, 0x98], [0x2122, 0x99], [0x0161, 0x9a], [0x203a, 0x9b],
  [0x0153, 0x9c], [0x017e, 0x9e], [0x0178, 0x9f],
]);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|js|mjs)$/.test(name)) out.push(p);
  }
  return out;
}

function toBytes(s) {
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code <= 0xff) bytes[i] = code;
    else {
      const m = CP1252_REV.get(code);
      if (m === undefined) return null;
      bytes[i] = m;
    }
  }
  return bytes;
}

function repairChunk(s) {
  const bytes = toBytes(s);
  if (!bytes) return null;
  const out = Buffer.from(bytes).toString("utf8");
  if (out.includes("\uFFFD")) return null;
  return out;
}

function hasMojibake(s) {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c === 0xd8 || c === 0xd9 || c === 0xda || c === 0xdb) return true;
  }
  return s.includes("â€");
}

function kurdishCount(s) {
  return (s.match(/[\u0600-\u06FF]/g) || []).length;
}

function mojiCount(s) {
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c === 0xd8 || c === 0xd9 || c === 0xda || c === 0xdb) n++;
  }
  if (s.includes("â€")) n += 2;
  return n;
}

function improve(a, b) {
  return Boolean(b) && b !== a && kurdishCount(b) >= kurdishCount(a) && mojiCount(b) < mojiCount(a);
}

function repairMixed(s) {
  if (!hasMojibake(s)) return s;
  const whole = repairChunk(s);
  if (improve(s, whole)) return whole;

  // Split into runs that look like mojibake vs clean
  let out = "";
  let i = 0;
  while (i < s.length) {
    const c = s.charCodeAt(i);
    // Start a run if we see Ø/Ù or â€
    if (
      c === 0xd8 ||
      c === 0xd9 ||
      c === 0xda ||
      c === 0xdb ||
      s.startsWith("â€", i)
    ) {
      let j = i;
      while (j < s.length) {
        const cj = s.charCodeAt(j);
        const keep =
          cj === 0xd8 ||
          cj === 0xd9 ||
          cj === 0xda ||
          cj === 0xdb ||
          (cj >= 0x80 && cj <= 0xff) ||
          CP1252_REV.has(cj) ||
          s.startsWith("â€", j);
        if (!keep && cj < 0x80) break;
        if (!keep && cj >= 0x600 && cj <= 0x6ff) break;
        if (!keep) break;
        if (s.startsWith("â€", j)) {
          j += 3; // â € and following byte letter often
          // actually â€" is 3 chars: â € —
          continue;
        }
        j++;
      }
      // Expand â€ sequences properly
      j = i + 1;
      while (j < s.length) {
        const cj = s.charCodeAt(j);
        if (
          cj === 0xd8 ||
          cj === 0xd9 ||
          cj === 0xda ||
          cj === 0xdb ||
          (cj >= 0x80 && cj <= 0xff) ||
          CP1252_REV.has(cj)
        ) {
          j++;
          continue;
        }
        break;
      }
      // Also consume trailing â€X as a unit when at start
      if (s.startsWith("â€", i)) {
        j = Math.max(j, i + 3);
        while (j < s.length) {
          const cj = s.charCodeAt(j);
          if (
            cj === 0xd8 ||
            cj === 0xd9 ||
            cj === 0xda ||
            cj === 0xdb ||
            (cj >= 0x80 && cj <= 0xff) ||
            CP1252_REV.has(cj)
          )
            j++;
          else break;
        }
      }
      const run = s.slice(i, j);
      const r = repairChunk(run);
      out += improve(run, r) ? r : run;
      i = j;
      continue;
    }
    out += s[i];
    i++;
  }
  return out;
}

function unescapeStr(inner) {
  return inner
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, "\\");
}

function escapeStr(s, q) {
  let r = s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t");
  if (q === '"') r = r.replace(/"/g, '\\"');
  if (q === "'") r = r.replace(/'/g, "\\'");
  if (q === "`") r = r.replace(/`/g, "\\`");
  return r;
}

/** Repair static parts of a template literal body (may contain ${...}). */
function repairTemplateBody(body) {
  let out = "";
  let i = 0;
  let changed = false;
  while (i < body.length) {
    if (body[i] === "$" && body[i + 1] === "{") {
      let depth = 1;
      let j = i + 2;
      while (j < body.length && depth > 0) {
        if (body[j] === "{") depth++;
        else if (body[j] === "}") depth--;
        j++;
      }
      out += body.slice(i, j);
      i = j;
      continue;
    }
    let j = i;
    while (j < body.length && !(body[j] === "$" && body[j + 1] === "{")) j++;
    const chunk = body.slice(i, j);
    const fixed = repairMixed(chunk);
    if (fixed !== chunk) changed = true;
    out += fixed;
    i = j;
  }
  return changed ? out : null;
}

function processFile(text) {
  let changed = false;

  let out = text.replace(/(["'])(?:\\.|(?!\1)[^\\])*\1/g, (full) => {
    const q = full[0];
    const inner = full.slice(1, -1);
    if (!hasMojibake(inner)) return full;
    const raw = unescapeStr(inner);
    const fixed = repairMixed(raw);
    if (fixed === raw) return full;
    changed = true;
    return q + escapeStr(fixed, q) + q;
  });

  // Template literals — scan manually for backticks
  {
    let result = "";
    let i = 0;
    const s = out;
    while (i < s.length) {
      if (s[i] === "`") {
        let j = i + 1;
        let body = "";
        while (j < s.length) {
          if (s[j] === "\\") {
            body += s[j] + (s[j + 1] || "");
            j += 2;
            continue;
          }
          if (s[j] === "`") break;
          body += s[j];
          j++;
        }
        if (j >= s.length) {
          result += s[i];
          i++;
          continue;
        }
        if (hasMojibake(body)) {
          const fixedBody = repairTemplateBody(body);
          if (fixedBody !== null) {
            changed = true;
            result += "`" + fixedBody + "`";
            i = j + 1;
            continue;
          }
        }
        result += s.slice(i, j + 1);
        i = j + 1;
        continue;
      }
      result += s[i];
      i++;
    }
    out = result;
  }

  out = out.replace(/>([^<>{]+)</g, (full, inner) => {
    if (!hasMojibake(inner)) return full;
    const fixed = repairMixed(inner);
    if (fixed === inner) return full;
    changed = true;
    return `>${fixed}<`;
  });

  return changed ? out : null;
}

const files = walk(ROOT);
let n = 0;
const list = [];
for (const file of files) {
  const text = readFileSync(file, "utf8");
  if (!hasMojibake(text)) continue;
  const fixed = processFile(text);
  if (!fixed) {
    console.log("UNFIXED", relative(ROOT, file));
    continue;
  }
  writeFileSync(file, fixed, "utf8");
  n++;
  list.push(relative(ROOT, file));
}
console.log(`Repaired ${n} files`);
for (const f of list) console.log(" ", f);

let residual = 0;
for (const file of files) {
  const text = readFileSync(file, "utf8");
  if (hasMojibake(text)) {
    residual++;
    console.log("RESIDUAL", relative(ROOT, file));
  }
}
console.log("Residual:", residual);
