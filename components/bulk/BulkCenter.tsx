"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Layers3, RotateCcw } from "lucide-react";
import {
  BULK_ACTION_LABELS,
  BULK_MODULE_LABELS,
} from "@/lib/bulk/types";
import { relativeTime } from "@/lib/drafts/centerMeta";
import { undoBulkJob } from "@/lib/bulk/client";
import { appToast } from "@/lib/toast";

type JobRow = {
  id: string;
  moduleKey: string;
  action: string;
  status: string;
  totalCount: number;
  processedCount: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  cancelledCount: number;
  canUndo: boolean;
  createdAt: number;
  finishedAt: number | null;
};

export default function BulkCenter() {
  const [items, setItems] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    const id = window.setTimeout(() => {
      void fetch("/api/bulk/jobs?limit=40", { cache: "no-store" })
        .then((r) => r.json())
        .then((j) => {
          if (j.success) setItems(j.data.items || []);
        })
        .catch(() => undefined)
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(id);
  };

  useEffect(() => {
    return refresh();
  }, []);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-black text-foreground">
          <Layers3 size={28} className="text-primary" aria-hidden />
          Bulk Operations
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Recent multi-record jobs · progress, failures, undo when available
        </p>
      </header>

      <section className="rek-card overflow-hidden p-0" aria-label="Bulk jobs">
        {loading ? (
          <p className="px-5 py-10 text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <p className="px-5 py-10 text-sm text-muted-foreground">
            No bulk operations yet. Select records in any module list to start.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead className="border-b border-border bg-muted/30 text-xs font-black uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-start">When</th>
                  <th className="px-4 py-3 text-start">Module</th>
                  <th className="px-4 py-3 text-start">Action</th>
                  <th className="px-4 py-3 text-start">Status</th>
                  <th className="px-4 py-3 text-start">Progress</th>
                  <th className="px-4 py-3 text-end">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((job) => (
                  <tr key={job.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 text-muted-foreground">
                      {relativeTime(job.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-bold">
                      {BULK_MODULE_LABELS[job.moduleKey] || job.moduleKey}
                    </td>
                    <td className="px-4 py-3">
                      {BULK_ACTION_LABELS[job.action] || job.action}
                    </td>
                    <td className="px-4 py-3 capitalize">{job.status}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {job.successCount}/{job.totalCount} ok · {job.failedCount}{" "}
                      failed · {job.skippedCount} skipped
                    </td>
                    <td className="px-4 py-3 text-end">
                      <div className="inline-flex gap-2">
                        <Link
                          href={`/dashboard/bulk?job=${job.id}`}
                          className="rounded-lg px-2 py-1 text-xs font-bold text-primary hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/35"
                        >
                          Details
                        </Link>
                        {job.canUndo && (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/35"
                            onClick={() => {
                              void undoBulkJob(job.id)
                                .then(() => {
                                  appToast.success("Bulk undo completed");
                                  refresh();
                                })
                                .catch((e) =>
                                  appToast.error(
                                    e instanceof Error ? e.message : "Undo failed"
                                  )
                                );
                            }}
                          >
                            <RotateCcw size={12} /> Undo
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
