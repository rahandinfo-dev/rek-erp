"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Archive, Pin, PlayCircle, RefreshCw, FileStack } from "lucide-react";
import {
  fetchDraftList,
  listLocalDrafts,
} from "@/lib/drafts/storage";
import { useDraftOwner } from "@/lib/drafts/owner";
import {
  relativeTime,
  resumeHrefForKey,
  type DraftListItem,
} from "@/lib/drafts/centerMeta";
import { useSessionRecovery } from "@/lib/recovery/provider";
import { MODULE_LABELS } from "@/lib/recovery/types";
import { useRouter } from "next/navigation";

function useMergedDrafts(limit = 5) {
  const { userId } = useDraftOwner();
  const [items, setItems] = useState<DraftListItem[]>([]);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    const id = window.setTimeout(async () => {
      const local = listLocalDrafts(userId);
      const remote = navigator.onLine ? await fetchDraftList() : [];
      const map = new Map<string, DraftListItem>();
      for (const d of local) map.set(d.key, d);
      for (const d of remote) {
        const prev = map.get(d.key);
        if (!prev || d.savedAt >= prev.savedAt) map.set(d.key, d);
      }
      if (!active) return;
      setItems(
        [...map.values()]
          .filter((d) => !d.archived && d.status !== "completed")
          .sort((a, b) => {
            if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
            return b.updatedAt - a.updatedAt;
          })
          .slice(0, limit)
      );
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(id);
    };
  }, [userId, limit]);

  return items;
}

/** Enhanced Continue Working — last draft + sessions */
export function ContinueWorkingDraftWidget() {
  const router = useRouter();
  const drafts = useMergedDrafts(4);
  const { sessions, restoreSession } = useSessionRecovery();
  const topSession = sessions
    .filter((s) => s.summary.draftStatus !== "empty")
    .sort((a, b) => b.lastEditedAt - a.lastEditedAt)[0];
  const last = drafts[0];

  return (
    <section aria-label="Continue Working" className="rek-card overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <PlayCircle size={18} className="text-primary" aria-hidden />
          <h2 className="text-lg font-black text-foreground">Continue Working</h2>
        </div>
        <Link
          href="/dashboard/drafts"
          className="text-xs font-bold text-primary hover:underline"
        >
          Draft Center
        </Link>
      </div>

      {!last && !topSession ? (
        <p className="px-5 py-8 text-sm text-muted-foreground">
          No unfinished work — you are all caught up.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {last ? (
            <li className="flex items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{last.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {last.moduleLabel} · {last.progress}% ·{" "}
                  {relativeTime(last.updatedAt)}
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${last.progress}%` }}
                  />
                </div>
              </div>
              <button
                type="button"
                className="shrink-0 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
                onClick={() =>
                  router.push(last.resumeHref || resumeHrefForKey(last.key))
                }
              >
                Resume
              </button>
            </li>
          ) : null}
          {drafts.slice(last ? 1 : 0).map((d) => (
            <li key={d.key} className="flex items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{d.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {d.moduleLabel} · {d.progress}%
                </p>
              </div>
              <button
                type="button"
                className="shrink-0 rounded-xl border border-border px-3 py-2 text-xs font-bold"
                onClick={() =>
                  router.push(d.resumeHref || resumeHrefForKey(d.key))
                }
              >
                Resume
              </button>
            </li>
          ))}
          {topSession && !last ? (
            <li className="flex items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">
                  {topSession.title ||
                    MODULE_LABELS[topSession.moduleKey] ||
                    topSession.moduleKey}
                </p>
                <p className="text-xs text-muted-foreground">Session recovery</p>
              </div>
              <button
                type="button"
                className="shrink-0 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
                onClick={() => void restoreSession(topSession)}
              >
                Resume
              </button>
            </li>
          ) : null}
        </ul>
      )}
    </section>
  );
}

export function RecentDraftsWidget() {
  const router = useRouter();
  const drafts = useMergedDrafts(6);
  return (
    <section aria-label="Recent Drafts" className="rek-card overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <FileStack size={18} className="text-primary" />
          <h2 className="text-lg font-black">Recent Drafts</h2>
        </div>
        <Link href="/dashboard/drafts" className="text-xs font-bold text-primary">
          View all
        </Link>
      </div>
      {drafts.length === 0 ? (
        <p className="px-5 py-8 text-sm text-muted-foreground">No recent drafts</p>
      ) : (
        <ul className="divide-y divide-border">
          {drafts.map((d) => (
            <li key={d.key} className="flex items-center gap-3 px-5 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{d.title}</p>
                <p className="text-xs text-muted-foreground">
                  {d.moduleLabel} · {relativeTime(d.updatedAt)}
                </p>
              </div>
              <button
                type="button"
                className="text-xs font-bold text-primary"
                onClick={() =>
                  router.push(d.resumeHref || resumeHrefForKey(d.key))
                }
              >
                Open
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function PinnedDraftsWidget() {
  const router = useRouter();
  const drafts = useMergedDrafts(20).filter((d) => d.pinned).slice(0, 5);
  return (
    <section aria-label="Pinned Drafts" className="rek-card overflow-hidden p-0">
      <div className="flex items-center gap-2 border-b border-border px-5 py-4">
        <Pin size={18} className="text-primary" />
        <h2 className="text-lg font-black">Pinned Drafts</h2>
      </div>
      {drafts.length === 0 ? (
        <p className="px-5 py-8 text-sm text-muted-foreground">
          Pin drafts in Draft Center to keep them here.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {drafts.map((d) => (
            <li key={d.key} className="flex items-center gap-3 px-5 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{d.title}</p>
                <p className="text-xs text-muted-foreground">{d.progress}%</p>
              </div>
              <button
                type="button"
                className="text-xs font-bold text-primary"
                onClick={() =>
                  router.push(d.resumeHref || resumeHrefForKey(d.key))
                }
              >
                Resume
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function DraftStatisticsWidget() {
  const [stats, setStats] = useState<{
    total: number;
    recovered: number;
    completed: number;
    archived: number;
    failed: number;
  } | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void fetch("/api/drafts/stats", { cache: "no-store" })
        .then((r) => r.json())
        .then((j) => {
          if (j.success) setStats(j.data);
        })
        .catch(() => undefined);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  const rows = stats
    ? [
        ["Total", stats.total],
        ["Recovered", stats.recovered],
        ["Completed", stats.completed],
        ["Archived", stats.archived],
        ["Failed", stats.failed],
      ]
    : [];

  return (
    <section aria-label="Draft Statistics" className="rek-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <Archive size={18} className="text-primary" />
        <h2 className="text-lg font-black">Draft Statistics</h2>
      </div>
      {!stats ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <dl className="grid grid-cols-2 gap-3">
          {rows.map(([k, v]) => (
            <div key={String(k)} className="rounded-xl bg-muted/50 px-3 py-2">
              <dt className="text-[10px] font-bold text-muted-foreground uppercase">
                {k}
              </dt>
              <dd className="text-lg font-black">{v as number}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

export function RecoveryStatusWidget() {
  const { connection, sessions } = useSessionRecovery();
  return (
    <section aria-label="Recovery Status" className="rek-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <RefreshCw size={18} className="text-primary" />
        <h2 className="text-lg font-black">Recovery Status</h2>
      </div>
      <p className="text-sm font-bold capitalize text-foreground">
        {connection}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {sessions.length} unfinished session
        {sessions.length === 1 ? "" : "s"}
      </p>
      <Link
        href="/dashboard/recovery"
        className="mt-3 inline-block text-xs font-bold text-primary"
      >
        Open Recovery Center
      </Link>
    </section>
  );
}
