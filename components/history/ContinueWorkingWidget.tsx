"use client";

import Link from "next/link";
import { PlayCircle } from "lucide-react";
import { useSessionRecovery } from "@/lib/recovery/provider";
import { MODULE_LABELS, relativeTime } from "@/lib/recovery/types";

export default function ContinueWorkingWidget() {
  const { sessions, restoreSession } = useSessionRecovery();
  const unfinished = sessions
    .filter((s) => s.summary.draftStatus !== "empty")
    .sort((a, b) => b.lastEditedAt - a.lastEditedAt)
    .slice(0, 4);

  return (
    <section
      aria-label="Continue Working"
      className="rek-card overflow-hidden p-0"
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <PlayCircle size={18} className="text-primary" aria-hidden />
          <h2 className="text-lg font-black text-foreground">
            Continue Working
          </h2>
        </div>
        <Link
          href="/dashboard/drafts"
          className="text-xs font-bold text-primary hover:underline"
        >
          Draft Center
        </Link>
      </div>

      {unfinished.length === 0 ? (
        <p className="px-5 py-8 text-sm text-muted-foreground">
          No unfinished work — you are all caught up.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {unfinished.map((s) => {
            const progress = Math.min(
              100,
              Math.round(
                (s.summary.fieldsChanged /
                  Math.max(4, s.summary.fieldsChanged + 2)) *
                  100
              )
            );
            return (
              <li
                key={s.id}
                className="flex items-center gap-3 px-5 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">
                    {s.title ||
                      MODULE_LABELS[s.moduleKey] ||
                      s.moduleKey}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {MODULE_LABELS[s.moduleKey] || s.moduleKey} ·{" "}
                    {relativeTime(s.lastEditedAt)}
                  </p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  className="shrink-0 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
                  onClick={() => void restoreSession(s)}
                >
                  Resume
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
