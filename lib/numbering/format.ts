import type { NumberingRuleView, ResetPolicy } from "@/lib/numbering/types";

export function periodKeyFor(
  policy: ResetPolicy,
  now: Date,
  fiscalYearStartMonth: number
): string {
  if (policy === "none") return "";
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  if (policy === "monthly") {
    return `${y}-${String(m).padStart(2, "0")}`;
  }
  // yearly — fiscal year label
  const fy =
    m >= fiscalYearStartMonth ? y : y - 1;
  return String(fy);
}

export function fiscalYear(
  now: Date,
  fiscalYearStartMonth: number
): number {
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  return m >= fiscalYearStartMonth ? y : y - 1;
}

export function renderFormat(
  rule: Pick<
    NumberingRuleView,
    | "format"
    | "prefix"
    | "suffix"
    | "moduleCode"
    | "padLength"
    | "fiscalYearStartMonth"
  >,
  seq: number,
  ctx: {
    companyCode?: string | null;
    warehouseCode?: string | null;
    now?: Date;
  }
): string {
  const now = ctx.now || new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const fy = String(fiscalYear(now, rule.fiscalYearStartMonth));
  const company = sanitizeToken(ctx.companyCode || "CO");
  const warehouse = sanitizeToken(ctx.warehouseCode || "WH");
  const moduleCode = sanitizeToken(rule.moduleCode || rule.prefix || "DOC");
  const prefix = sanitizeToken(rule.prefix || "");
  const suffix = sanitizeToken(rule.suffix || "");

  let out = rule.format || "{PREFIX}-{YYYY}-{SEQ}";

  out = out.replace(/\{SEQ(?::(\d+))?\}/gi, (_, pad) => {
    const width = pad ? Number(pad) : rule.padLength || 6;
    return String(seq).padStart(Math.max(1, Math.min(12, width)), "0");
  });
  out = out.replace(/\{YYYY\}/gi, yyyy);
  out = out.replace(/\{YY\}/gi, yyyy.slice(-2));
  out = out.replace(/\{MM\}/gi, mm);
  out = out.replace(/\{DD\}/gi, dd);
  out = out.replace(/\{FY\}/gi, fy);
  out = out.replace(/\{COMPANY\}/gi, company);
  out = out.replace(/\{WAREHOUSE\}/gi, warehouse);
  out = out.replace(/\{MODULE\}/gi, moduleCode);
  out = out.replace(/\{PREFIX\}/gi, prefix);
  out = out.replace(/\{SUFFIX\}/gi, suffix);

  // Cleanup accidental double separators
  return out
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function sanitizeToken(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 16);
}
