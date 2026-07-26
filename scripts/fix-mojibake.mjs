/**
 * Repair UTF-8 text that was mis-decoded as Windows-1252.
 * Repairs quoted string literals only so mixed ASCII/Unicode files stay safe.
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SKIP = new Set(["node_modules", ".next", "generated", ".git", "public"]);

/** Unicode → Windows-1252 byte for characters that differ from Latin-1 */
const CP1252_REV = new Map([
  [0x20ac, 0x80],
  [0x201a, 0x82],
  [0x0192, 0x83],
  [0x201e, 0x84],
  [0x2026, 0x85],
  [0x2020, 0x86],
  [0x2021, 0x87],
  [0x02c6, 0x88],
  [0x2030, 0x89],
  [0x0160, 0x8a],
  [0x2039, 0x8b],
  [0x0152, 0x8c],
  [0x017d, 0x8e],
  [0x2018, 0x91],
  [0x2019, 0x92],
  [0x201c, 0x93],
  [0x201d, 0x94],
  [0x2022, 0x95],
  [0x2013, 0x96],
  [0x2014, 0x97],
  [0x02dc, 0x98],
  [0x2122, 0x99],
  [0x0161, 0x9a],
  [0x203a, 0x9b],
  [0x0153, 0x9c],
  [0x017e, 0x9e],
  [0x0178, 0x9f],
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

function toCp1252Bytes(s) {
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code <= 0xff) {
      bytes[i] = code;
      continue;
    }
    const mapped = CP1252_REV.get(code);
    if (mapped === undefined) return null;
    bytes[i] = mapped;
  }
  return bytes;
}

function repairMojibake(s) {
  const bytes = toCp1252Bytes(s);
  if (!bytes) return null;
  const repaired = Buffer.from(bytes).toString("utf8");
  if (repaired.includes("\uFFFD")) return null;
  return repaired;
}

function mojibakeScore(s) {
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c === 0xd8 || c === 0xd9 || c === 0xda || c === 0xdb) n++;
    if (CP1252_REV.has(c)) n += 2;
  }
  return n;
}

function kurdishScore(s) {
  return (s.match(/[\u0600-\u06FF]/g) || []).length;
}

function shouldRepair(original, repaired) {
  if (!repaired || repaired === original) return false;
  const kb = kurdishScore(original);
  const ka = kurdishScore(repaired);
  const mb = mojibakeScore(original);
  const ma = mojibakeScore(repaired);
  return ka > kb && ma < mb;
}

function repairFileText(text) {
  let changed = false;
  // Double and single quoted strings (no nested template expressions)
  const out = text.replace(/(["'])(?:\\.|(?!\1)[^\\])*\1/g, (full) => {
    const q = full[0];
    const inner = full.slice(1, -1);
    if (mojibakeScore(inner) < 2) return full;
    // Unescape for repair, then re-escape
    const unescaped = inner
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\r")
      .replace(/\\t/g, "\t")
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'")
      .replace(/\\\\/g, "\\");
    const repaired = repairMojibake(unescaped);
    if (!shouldRepair(unescaped, repaired)) return full;
    changed = true;
    const escaped = repaired
      .replace(/\\/g, "\\\\")
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/\t/g, "\\t")
      .replace(new RegExp(q, "g"), `\\${q}`);
    return q + escaped + q;
  });
  return changed ? out : null;
}

const files = walk(ROOT);
let changedFiles = 0;
const list = [];

for (const file of files) {
  const text = readFileSync(file, "utf8");
  if (mojibakeScore(text) < 3) continue;
  const fixed = repairFileText(text);
  if (!fixed) continue;
  writeFileSync(file, fixed, "utf8");
  changedFiles++;
  list.push(relative(ROOT, file));
}

console.log(`Repaired ${changedFiles} files`);
for (const f of list) console.log(" ", f);
