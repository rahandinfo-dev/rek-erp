"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Copy,
  Download,
  Eye,
  History,
  Link2,
  RefreshCw,
  RotateCcw,
  Search,
  GitCompare,
} from "lucide-react";
import type { AuditLogRow } from "@/lib/audit/query";
import {
  AUDIT_ACTION_LABELS,
  AUDIT_ACTIONS,
  AUDIT_MODULE_LABELS,
  AUDIT_MODULES,
  AUDIT_STATUS_LABELS,
} from "@/lib/audit/modules";
import { compareValues } from "@/lib/audit/diff";
import { groupTimeline } from "@/lib/audit/timeline";
import {
  mergeActivityCache,
  readActivityCache,
} from "@/lib/audit/offline";
import {
  canRestoreVersion,
  recordHrefFor,
  restoreApiFor,
} from "@/lib/audit/restore";
import { useDraftOwner } from "@/lib/drafts/owner";
import { appToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { inputClassName } from "@/components/ui/FormPrimitives";

type UserOpt = { id: string; fullName: string };

type Props = {
  users: UserOpt[];
  initialItems: AuditLogRow[];
  viewerId: string;
};

type Scope = "all" | "mine" | "team";
type SortKey = "newest" | "oldest";

const DEVICES = ["Desktop", "Mobile", "Tablet", "Other", "Unknown"];
const STATUSES = ["success", "failed", "pending", "warning"];

export default function ActivityTimeline({
  users,
  initialItems,
  viewerId,
}: Props) {
  const { userId } = useDraftOwner();
  const searchParams = useSearchParams();
  const [items, setItems] = useState(initialItems);
  const [q, setQ] = useState("");
  const [module, setModule] = useState("");
  const [action, setAction] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [device, setDevice] = useState("");
  const [status, setStatus] = useState("");
  const [scope, setScope] = useState<Scope>("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | null>(
    initialItems.length
      ? initialItems[initialItems.length - 1].createdAt
      : null
  );
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [details, setDetails] = useState<AuditLogRow | null>(null);
  const [compareRow, setCompareRow] = useState<AuditLogRow | null>(null);
  const [versions, setVersions] = useState<AuditLogRow[]>([]);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const newestRef = useRef(initialItems[0]?.createdAt || "");

  const load = useCallback(
    async (opts?: { append?: boolean; silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      const params = new URLSearchParams({
        pageSize: "30",
        sort,
      });
      if (q.trim()) params.set("q", q.trim());
      if (module) params.set("module", module);
      if (action) params.set("action", action);
      if (filterUser) params.set("userId", filterUser);
      if (device) params.set("device", device);
      if (status) params.set("status", status);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (scope === "mine") params.set("scope", "mine");
      if (opts?.append && cursor) params.set("cursor", cursor);

      try {
        if (!navigator.onLine) {
          const cached = readActivityCache(userId || viewerId);
          setItems(cached);
          setHasMore(false);
          appToast.info("Offline", "Showing cached activity");
          return;
        }

        const res = await fetch(`/api/audit-logs?${params}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (!json.success) {
          appToast.error(json.message || "Failed to load activity");
          return;
        }
        const next = json.data.items as AuditLogRow[];
        const pag = json.data.pagination as {
          nextCursor: string | null;
          hasMore: boolean;
        };

        setItems((prev) => {
          const merged = opts?.append
            ? (() => {
                const map = new Map<string, AuditLogRow>();
                for (const r of [...prev, ...next]) map.set(r.id, r);
                return [...map.values()];
              })()
            : next;
          mergeActivityCache(userId || viewerId, merged);
          return merged;
        });
        setCursor(pag.nextCursor);
        setHasMore(Boolean(pag.hasMore));
        if (!opts?.append && next[0]) newestRef.current = next[0].createdAt;
      } catch {
        const cached = readActivityCache(userId || viewerId);
        if (cached.length) {
          setItems(cached);
          appToast.info("Offline", "Showing cached activity");
        } else appToast.error("Failed to load activity");
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [
      q,
      module,
      action,
      filterUser,
      device,
      status,
      from,
      to,
      scope,
      sort,
      cursor,
      userId,
      viewerId,
    ]
  );

  // Deep link ?id=
  useEffect(() => {
    const id = searchParams.get("id");
    if (!id) return;
    const t = window.setTimeout(() => {
      const found = items.find((r) => r.id === id);
      if (found) {
        setDetails(found);
        return;
      }
      void fetch(`/api/audit-logs?id=${encodeURIComponent(id)}`, {
        cache: "no-store",
      })
        .then((r) => r.json())
        .then((j) => {
          if (j.success && j.data) setDetails(j.data as AuditLogRow);
        })
        .catch(() => undefined);
    }, 0);
    return () => window.clearTimeout(t);
  }, [searchParams, items]);

  // Reset list when filters change
  useEffect(() => {
    const id = window.setTimeout(() => {
      setCursor(null);
      void (async () => {
        setLoading(true);
        const params = new URLSearchParams({
          pageSize: "30",
          sort,
          page: "1",
        });
        if (q.trim()) params.set("q", q.trim());
        if (module) params.set("module", module);
        if (action) params.set("action", action);
        if (filterUser) params.set("userId", filterUser);
        if (device) params.set("device", device);
        if (status) params.set("status", status);
        if (from) params.set("from", from);
        if (to) params.set("to", to);
        if (scope === "mine") params.set("scope", "mine");
        try {
          if (!navigator.onLine) {
            setItems(readActivityCache(userId || viewerId));
            return;
          }
          const res = await fetch(`/api/audit-logs?${params}`, {
            cache: "no-store",
          });
          const json = await res.json();
          if (json.success) {
            setItems(json.data.items);
            setCursor(json.data.pagination.nextCursor);
            setHasMore(json.data.pagination.hasMore);
            mergeActivityCache(userId || viewerId, json.data.items);
            if (json.data.items[0])
              newestRef.current = json.data.items[0].createdAt;
          }
        } catch {
          setItems(readActivityCache(userId || viewerId));
        } finally {
          setLoading(false);
        }
      })();
    }, 280);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, module, action, filterUser, device, status, from, to, scope, sort]);

  // Infinite scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loading) {
          void load({ append: true, silent: true });
        }
      },
      { rootMargin: "240px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loading, load]);

  // Realtime poll
  useEffect(() => {
    if (!autoRefresh) return;
    const id = window.setInterval(async () => {
      if (!navigator.onLine || !newestRef.current) return;
      try {
        const params = new URLSearchParams({
          since: newestRef.current,
          pageSize: "20",
          sort: "newest",
        });
        if (scope === "mine") params.set("scope", "mine");
        const res = await fetch(`/api/audit-logs?${params}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (!json.success || !json.data.items?.length) return;
        const newer = json.data.items as AuditLogRow[];
        setItems((prev) => {
          const map = new Map<string, AuditLogRow>();
          for (const r of [...newer, ...prev]) map.set(r.id, r);
          const next = [...map.values()].sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          mergeActivityCache(userId || viewerId, next);
          return next;
        });
        newestRef.current = newer[0].createdAt;
      } catch {
        /* offline */
      }
    }, 12000);
    return () => window.clearInterval(id);
  }, [autoRefresh, scope, userId, viewerId]);

  const groups = useMemo(() => groupTimeline(items), [items]);

  async function openVersions(row: AuditLogRow) {
    if (!row.entityType || !row.entityId) {
      setCompareRow(row);
      return;
    }
    try {
      const res = await fetch(
        `/api/audit-logs?entityType=${encodeURIComponent(row.entityType)}&entityId=${encodeURIComponent(row.entityId)}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      if (json.success) setVersions(json.data.versions || []);
      setCompareRow(row);
    } catch {
      setCompareRow(row);
    }
  }

  async function restore(row: AuditLogRow) {
    if (!restoreApiFor(row) || row.action !== "DELETE") {
      appToast.warning("Restore not available for this activity");
      return;
    }
    if (!window.confirm("Restore this record from the activity timeline?"))
      return;
    try {
      const res = await fetch("/api/audit-logs/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auditId: row.id }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        appToast.error(json.message || "Restore failed");
        return;
      }
      appToast.success("Record restored");
      void load();
    } catch {
      appToast.error("Restore failed");
    }
  }

  function copyLink(row: AuditLogRow) {
    const url = `${window.location.origin}/dashboard/activity?id=${row.id}`;
    void navigator.clipboard?.writeText(url);
    appToast.success("Link copied");
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(items, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `activity-${Date.now()}.json`;
    a.click();
    appToast.success("Exported");
  }

  const diffs = compareRow
    ? compareValues(compareRow.oldValue, compareRow.newValue)
    : [];

  return (
    <div className="w-full min-w-0 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-2xl bg-secondary px-3 py-1 text-sm font-bold text-primary">
            <History size={16} />
            Activity Timeline
          </div>
          <h1 className="text-3xl font-black text-primary sm:text-4xl">
            Activity Timeline
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            User · Action · Module · Record · Time · Device · Status — searchable
            enterprise history
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex h-10 items-center gap-2 rounded-2xl border border-border bg-card px-3 text-xs font-bold">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto Refresh
          </label>
          <button
            type="button"
            onClick={() => exportJson()}
            className="inline-flex h-10 items-center gap-2 rounded-2xl border border-border bg-card px-3 text-xs font-bold"
          >
            <Download size={14} /> Export
          </button>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex h-10 items-center gap-2 rounded-2xl border border-border bg-card px-4 text-sm font-bold text-primary"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      <div className="rek-card space-y-3 p-4 sm:p-5">
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute top-1/2 end-3 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Global search: user, module, action, record, device…"
            className={`${inputClassName} pe-10`}
            aria-label="Search activity"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["all", "Team Activity"],
              ["mine", "My Activity"],
              ["team", "Everyone"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setScope(k === "team" ? "all" : k)}
              className={cn(
                "rounded-xl px-3 py-1.5 text-[11px] font-bold",
                (k === "team" ? scope === "all" : scope === k)
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <select
            value={module}
            onChange={(e) => setModule(e.target.value)}
            className={inputClassName}
            aria-label="Filter module"
          >
            <option value="">All modules</option>
            {AUDIT_MODULES.map((m) => (
              <option key={m} value={m}>
                {AUDIT_MODULE_LABELS[m] || m}
              </option>
            ))}
          </select>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className={inputClassName}
            aria-label="Filter action"
          >
            <option value="">All actions</option>
            {AUDIT_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {AUDIT_ACTION_LABELS[a] || a}
              </option>
            ))}
          </select>
          <select
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className={inputClassName}
            aria-label="Filter user"
          >
            <option value="">All users</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName}
              </option>
            ))}
          </select>
          <select
            value={device}
            onChange={(e) => setDevice(e.target.value)}
            className={inputClassName}
            aria-label="Filter device"
          >
            <option value="">All devices</option>
            {DEVICES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={inputClassName}
            aria-label="Filter status"
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {AUDIT_STATUS_LABELS[s] || s}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className={inputClassName}
            aria-label="Sort"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className={inputClassName}
            aria-label="From date"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className={inputClassName}
            aria-label="To date"
          />
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-3xl border border-border bg-card p-10 text-center text-muted-foreground">
          {loading ? "Loading activity…" : "No activity found."}
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((g) => (
            <section key={g.key} aria-labelledby={`g-${g.key}`}>
              <h2
                id={`g-${g.key}`}
                className="mb-3 text-xs font-black tracking-wide text-muted-foreground uppercase"
              >
                {g.label}
              </h2>
              <ul className="space-y-2">
                {g.items.map((row) => (
                  <li
                    key={row.id}
                    className="rounded-2xl border border-border bg-card p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-foreground">
                          {row.recordName}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          <span className="font-bold text-foreground">
                            {row.userName || "System"}
                          </span>
                          {" · "}
                          {AUDIT_ACTION_LABELS[row.action] || row.action}
                          {" · "}
                          {AUDIT_MODULE_LABELS[row.module] || row.module}
                          {" · "}
                          {row.date} {row.time}
                          {row.device ? ` · ${row.device}` : ""}
                        </p>
                        {row.summary && row.summary !== row.recordName ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {row.summary}
                          </p>
                        ) : null}
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase",
                          row.status === "failed"
                            ? "bg-destructive/10 text-destructive"
                            : row.status === "warning"
                              ? "bg-amber-50 text-amber-800"
                              : "bg-muted text-muted-foreground"
                        )}
                      >
                        {AUDIT_STATUS_LABELS[row.status] || row.status}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <ActionBtn
                        icon={Eye}
                        label="Details"
                        onClick={() => setDetails(row)}
                      />
                      <ActionBtn
                        icon={GitCompare}
                        label="Compare"
                        onClick={() => void openVersions(row)}
                      />
                      {canRestoreVersion(row) && restoreApiFor(row) ? (
                        <ActionBtn
                          icon={RotateCcw}
                          label="Restore"
                          onClick={() => void restore(row)}
                        />
                      ) : null}
                      <ActionBtn
                        icon={Link2}
                        label="Copy Link"
                        onClick={() => copyLink(row)}
                      />
                      {recordHrefFor(row) ? (
                        <a
                          href={recordHrefFor(row)!}
                          className="inline-flex h-8 items-center gap-1 rounded-xl border border-border px-2.5 text-[11px] font-bold hover:bg-muted"
                        >
                          Open
                        </a>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <div ref={sentinelRef} className="h-8" aria-hidden />
          {loading ? (
            <p className="text-center text-xs text-muted-foreground">Loading…</p>
          ) : null}
          {!hasMore && items.length > 0 ? (
            <p className="text-center text-xs text-muted-foreground">
              End of timeline
            </p>
          ) : null}
        </div>
      )}

      {details ? (
        <Modal title="Activity Details" onClose={() => setDetails(null)}>
          <dl className="space-y-2 text-sm">
            {[
              ["User", details.userName || "System"],
              ["Action", AUDIT_ACTION_LABELS[details.action] || details.action],
              ["Module", AUDIT_MODULE_LABELS[details.module] || details.module],
              ["Record", details.recordName],
              ["Status", AUDIT_STATUS_LABELS[details.status] || details.status],
              ["Date", `${details.date} ${details.time}`],
              ["Device", details.device || "—"],
              ["IP", details.ipAddress || "—"],
              ["Description", details.summary || "—"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="max-w-[60%] truncate text-end font-bold">{v}</dd>
              </div>
            ))}
          </dl>
          <button
            type="button"
            className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-primary"
            onClick={() => copyLink(details)}
          >
            <Copy size={12} /> Copy deep link
          </button>
        </Modal>
      ) : null}

      {compareRow ? (
        <Modal
          title="Compare Changes"
          onClose={() => {
            setCompareRow(null);
            setVersions([]);
          }}
          wide
        >
          {versions.length > 1 ? (
            <p className="mb-3 text-xs text-muted-foreground">
              {versions.length} versions for this record
            </p>
          ) : null}
          {diffs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No field changes stored.</p>
          ) : (
            <div className="max-h-[55vh] overflow-auto">
              <table className="w-full text-start text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="py-2 pe-2 font-bold">Field</th>
                    <th className="py-2 pe-2 font-bold">Before</th>
                    <th className="py-2 font-bold">After</th>
                  </tr>
                </thead>
                <tbody>
                  {diffs.map((d) => (
                    <tr key={d.field} className="border-b border-border/60">
                      <td className="py-2 pe-2 font-bold">{d.field}</td>
                      <td className="py-2 pe-2 text-destructive">
                        <pre className="max-w-[220px] overflow-auto whitespace-pre-wrap">
                          {fmt(d.before)}
                        </pre>
                      </td>
                      <td className="py-2 text-[var(--success)]">
                        <pre className="max-w-[220px] overflow-auto whitespace-pre-wrap">
                          {fmt(d.after)}
                        </pre>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Modal>
      ) : null}
    </div>
  );
}

function fmt(v: unknown) {
  if (v == null) return "—";
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

function ActionBtn({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Eye;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 items-center gap-1 rounded-xl border border-border px-2.5 text-[11px] font-bold hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/30"
    >
      <Icon size={12} />
      {label}
    </button>
  );
}

function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-[var(--overlay)] p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-10 w-full rounded-2xl border border-border bg-card p-5 shadow-2xl",
          wide ? "max-w-3xl" : "max-w-md"
        )}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-black">{title}</h3>
          <button
            type="button"
            className="text-xs font-bold text-muted-foreground"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
