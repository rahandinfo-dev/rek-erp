"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Copy,
  Eye,
  GitCompare,
  History,
  RotateCcw,
  ExternalLink,
} from "lucide-react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import VersionCompare, {
  type CompareDiff,
} from "@/components/versions/VersionCompare";
import type { EntityVersionRow } from "@/lib/versions/types";
import { VERSION_ACTION_LABELS } from "@/lib/versions/types";
import { versionPageHref } from "@/lib/versions/urls";
import { appToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type Props = {
  entityType: string;
  entityId: string;
  recordLabel?: string;
  className?: string;
  /** Compact embed inside record pages */
  compact?: boolean;
};

export default function VersionHistoryPanel({
  entityType,
  entityId,
  recordLabel,
  className,
  compact = false,
}: Props) {
  const [items, setItems] = useState<EntityVersionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [viewId, setViewId] = useState<string | null>(null);
  const [compareDiffs, setCompareDiffs] = useState<CompareDiff[] | null>(null);
  const [compareLabels, setCompareLabels] = useState({ left: "", right: "" });
  const [restoreId, setRestoreId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        entityType,
        entityId,
        pageSize: "40",
        sort: "version_desc",
      });
      const res = await fetch(`/api/versions?${params}`, { cache: "no-store" });
      const json = await res.json();
      if (json.success) setItems(json.data.items || []);
    } catch {
      appToast.error("Failed to load version history");
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(t);
  }, [load]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1]!, id];
      return [...prev, id];
    });
  }

  async function runCompare() {
    if (selected.length !== 2) {
      appToast.info("Select two versions to compare");
      return;
    }
    const [a, b] = selected;
    const res = await fetch(
      `/api/versions/compare?a=${encodeURIComponent(a!)}&b=${encodeURIComponent(b!)}`
    );
    const json = await res.json();
    if (!json.success) {
      appToast.error(json.message || "Compare failed");
      return;
    }
    setCompareDiffs(json.data.diffs);
    setCompareLabels({
      left: `v${json.data.left.versionNumber}`,
      right: `v${json.data.right.versionNumber}`,
    });
  }

  async function copyLink(id: string) {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}${versionPageHref(id)}`
      );
      appToast.success("Version link copied");
    } catch {
      appToast.error("Copy failed");
    }
  }

  async function confirmRestore() {
    if (!restoreId) return;
    setRestoring(true);
    try {
      const res = await fetch(`/api/versions/${restoreId}/restore`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!json.success) {
        appToast.error(json.message || "Restore failed");
        return;
      }
      appToast.success("Version restored");
      setRestoreId(null);
      setCompareDiffs(null);
      await load();
    } finally {
      setRestoring(false);
    }
  }

  const viewing = viewId ? items.find((i) => i.id === viewId) : null;

  return (
    <section
      className={cn("space-y-4", className)}
      aria-label="Version history"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <History size={18} className="text-primary" aria-hidden />
          <h2 className="text-lg font-black text-foreground">
            Version History
            {recordLabel ? (
              <span className="ms-2 text-sm font-semibold text-muted-foreground">
                · {recordLabel}
              </span>
            ) : null}
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-xs font-bold hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/35"
            onClick={() => void runCompare()}
            disabled={selected.length !== 2}
          >
            <GitCompare size={14} aria-hidden />
            Compare
          </button>
          <Link
            href={`/dashboard/version-history?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-xs font-bold hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/35"
          >
            <ExternalLink size={14} aria-hidden />
            Open full history
          </Link>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading versions…</p>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          No versions recorded yet. Edits will appear here automatically.
        </p>
      ) : (
        <div className="rek-table-shell">
          <div className="rek-table-wrap">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-muted/80 text-right">
                <tr>
                  <th className="px-3 py-2.5 font-bold" scope="col">
                    <span className="sr-only">Select</span>
                  </th>
                  <th className="px-3 py-2.5 font-bold" scope="col">
                    Ver
                  </th>
                  <th className="px-3 py-2.5 font-bold" scope="col">
                    Action
                  </th>
                  {!compact ? (
                    <th className="px-3 py-2.5 font-bold" scope="col">
                      User
                    </th>
                  ) : null}
                  <th className="px-3 py-2.5 font-bold" scope="col">
                    When
                  </th>
                  <th className="px-3 py-2.5 font-bold" scope="col">
                    Changes
                  </th>
                  <th className="px-3 py-2.5 text-center font-bold" scope="col">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr
                    key={row.id}
                    className={cn(
                      "border-t border-border transition hover:bg-muted/40",
                      selected.includes(row.id) && "bg-primary/5"
                    )}
                  >
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={selected.includes(row.id)}
                        onChange={() => toggleSelect(row.id)}
                        aria-label={`Select version ${row.versionNumber}`}
                        className="focus-visible:ring-[3px] focus-visible:ring-ring/35"
                      />
                    </td>
                    <td className="px-3 py-2.5 font-black tabular-nums">
                      v{row.versionNumber}
                    </td>
                    <td className="px-3 py-2.5 font-semibold">
                      {VERSION_ACTION_LABELS[row.action] || row.action}
                    </td>
                    {!compact ? (
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {row.userName || "—"}
                      </td>
                    ) : null}
                    <td className="px-3 py-2.5 tabular-nums text-muted-foreground">
                      {row.date} {row.time}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {row.changedFields.length
                        ? row.changedFields
                            .slice(0, 3)
                            .map((f) => f.field)
                            .join(", ")
                        : "—"}
                      {row.changedFields.length > 3
                        ? ` +${row.changedFields.length - 3}`
                        : ""}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex justify-center gap-1">
                        <button
                          type="button"
                          className="rounded-lg p-1.5 hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/35"
                          aria-label={`View version ${row.versionNumber}`}
                          onClick={() => setViewId(row.id)}
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          type="button"
                          className="rounded-lg p-1.5 hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/35"
                          aria-label="Copy version link"
                          onClick={() => void copyLink(row.id)}
                        >
                          <Copy size={15} />
                        </button>
                        <button
                          type="button"
                          className="rounded-lg p-1.5 text-primary hover:bg-primary/10 focus-visible:ring-[3px] focus-visible:ring-ring/35"
                          aria-label={`Restore version ${row.versionNumber}`}
                          onClick={() => setRestoreId(row.id)}
                        >
                          <RotateCcw size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {compareDiffs ? (
        <div className="space-y-2">
          <h3 className="text-sm font-black">Comparison</h3>
          <VersionCompare
            leftLabel={compareLabels.left}
            rightLabel={compareLabels.right}
            diffs={compareDiffs}
          />
        </div>
      ) : null}

      {viewing ? (
        <div
          role="dialog"
          aria-label={`Version ${viewing.versionNumber}`}
          className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-xs)]"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-black">
                v{viewing.versionNumber} ·{" "}
                {VERSION_ACTION_LABELS[viewing.action] || viewing.action}
              </p>
              <p className="text-xs text-muted-foreground">
                {viewing.userName || "System"} · {viewing.date} {viewing.time}
              </p>
              {viewing.comment ? (
                <p className="mt-1 text-sm">{viewing.comment}</p>
              ) : null}
            </div>
            <button
              type="button"
              className="rounded-lg px-2 py-1 text-xs font-bold hover:bg-muted"
              onClick={() => setViewId(null)}
            >
              Close
            </button>
          </div>
          <VersionCompare
            leftLabel="Before"
            rightLabel="After"
            diffs={viewing.changedFields.map((f) => ({
              field: f.field,
              before: f.before,
              after: f.after,
              kind:
                f.before === undefined || f.before === null
                  ? "added"
                  : f.after === undefined || f.after === null
                    ? "removed"
                    : "modified",
            }))}
          />
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(restoreId)}
        title="Restore this version?"
        description="The live record will be updated to match this version snapshot. A new version entry will be created. This cannot be undone except by restoring another version."
        confirmText="Restore"
        cancelText="Cancel"
        loading={restoring}
        onCancel={() => setRestoreId(null)}
        onConfirm={() => void confirmRestore()}
      />
    </section>
  );
}
