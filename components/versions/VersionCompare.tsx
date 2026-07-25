"use client";

import { cn } from "@/lib/utils";

export type CompareDiff = {
  field: string;
  before: unknown;
  after: unknown;
  kind: "added" | "removed" | "modified";
};

function formatVal(v: unknown): string {
  if (v === undefined || v === null || v === "") return "—";
  if (typeof v === "object") {
    try {
      return JSON.stringify(v, null, 2);
    } catch {
      return String(v);
    }
  }
  return String(v);
}

export default function VersionCompare({
  leftLabel,
  rightLabel,
  diffs,
}: {
  leftLabel: string;
  rightLabel: string;
  diffs: CompareDiff[];
}) {
  if (!diffs.length) {
    return (
      <p className="rounded-xl border border-border bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
        No field differences between these versions.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border">
      <div className="grid grid-cols-3 gap-0 border-b border-border bg-muted/60 text-xs font-bold">
        <div className="px-3 py-2">Field</div>
        <div className="px-3 py-2">{leftLabel}</div>
        <div className="px-3 py-2">{rightLabel}</div>
      </div>
      <ul role="list" aria-label="Version comparison">
        {diffs.map((d) => (
          <li
            key={d.field}
            className={cn(
              "grid grid-cols-3 gap-0 border-b border-border/70 text-sm last:border-b-0",
              d.kind === "added" && "bg-emerald-50/80",
              d.kind === "removed" && "bg-red-50/80",
              d.kind === "modified" && "bg-amber-50/60"
            )}
          >
            <div className="px-3 py-2.5 font-semibold">
              <span className="sr-only">{d.kind}</span>
              {d.field}
              <span
                className={cn(
                  "ms-2 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                  d.kind === "added" && "bg-emerald-200 text-emerald-900",
                  d.kind === "removed" && "bg-red-200 text-red-900",
                  d.kind === "modified" && "bg-amber-200 text-amber-900"
                )}
              >
                {d.kind}
              </span>
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap break-all px-3 py-2.5 font-mono text-xs text-muted-foreground">
              {formatVal(d.before)}
            </pre>
            <pre className="overflow-x-auto whitespace-pre-wrap break-all px-3 py-2.5 font-mono text-xs">
              {formatVal(d.after)}
            </pre>
          </li>
        ))}
      </ul>
    </div>
  );
}
