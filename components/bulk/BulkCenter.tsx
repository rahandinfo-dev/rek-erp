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
import { useT } from "@/components/i18n/LocaleProvider";

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
  const { t } = useT();
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
          {t("bulk.centerTitle")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("bulk.centerSubtitle")}
        </p>
      </header>

      <section className="rek-card overflow-hidden p-0" aria-label={t("bulk.centerTitle")}>
        {loading ? (
          <p className="px-5 py-10 text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : items.length === 0 ? (
          <p className="px-5 py-10 text-sm text-muted-foreground">
            {t("bulk.centerEmpty")}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead className="border-b border-border bg-muted/30 text-xs font-black uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-start">{t("bulk.when")}</th>
                  <th className="px-4 py-3 text-start">{t("bulk.module")}</th>
                  <th className="px-4 py-3 text-start">{t("bulk.action")}</th>
                  <th className="px-4 py-3 text-start">{t("common.status")}</th>
                  <th className="px-4 py-3 text-start">{t("bulk.progressCol")}</th>
                  <th className="px-4 py-3 text-end">{t("bulk.actionsCol")}</th>
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
                      {t("bulk.progressLine", {
                        ok: job.successCount,
                        total: job.totalCount,
                        failed: job.failedCount,
                        skipped: job.skippedCount,
                      })}
                    </td>
                    <td className="px-4 py-3 text-end">
                      <div className="inline-flex gap-2">
                        <Link
                          href={`/dashboard/bulk?job=${job.id}`}
                          className="rounded-lg px-2 py-1 text-xs font-bold text-primary hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/35"
                        >
                          {t("common.details")}
                        </Link>
                        {job.canUndo && (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/35"
                            onClick={() => {
                              void undoBulkJob(job.id)
                                .then(() => {
                                  appToast.success(t("bulk.undoDone"));
                                  refresh();
                                })
                                .catch((e) =>
                                  appToast.error(
                                    e instanceof Error ? e.message : t("bulk.failed")
                                  )
                                );
                            }}
                          >
                            <RotateCcw size={12} /> {t("bulk.undo")}
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
