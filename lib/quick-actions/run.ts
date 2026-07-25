"use client";

import {
  runBulkJobToCompletion,
  startBulkJob,
} from "@/lib/bulk/client";
import { entityTypeFor } from "@/lib/bulk/modules";
import type { BulkAction, BulkModule } from "@/lib/bulk/types";
import { deleteUrlFor, restoreUrlFor } from "@/lib/bulk/urls";
import { exportToCsv, exportToExcel } from "@/lib/export";
import { ACTION_DEFS } from "@/lib/quick-actions/registry";
import type {
  QuickActionId,
  QuickActionRecord,
} from "@/lib/quick-actions/types";
import {
  absoluteUrl,
  auditHrefFor,
  duplicateHrefFor,
  editHrefFor,
  timelineHrefFor,
  viewHrefFor,
} from "@/lib/quick-actions/urls";
import { appToast } from "@/lib/toast";

export type RunDeps = {
  routerPush: (href: string) => void;
  toggleFavorite: (input: {
    href: string;
    title: string;
    moduleKey?: string;
    entityType?: string | null;
    entityId?: string | null;
  }) => void;
  toggleHistoryPin?: (href: string) => void | Promise<void>;
  isFavorite?: (href: string) => boolean;
  onComplete?: () => void;
};

async function runBulk(
  moduleKey: string,
  action: BulkAction,
  ids: string[]
) {
  const started = await startBulkJob({
    moduleKey: moduleKey as BulkModule,
    action,
    ids,
  });
  const job = await runBulkJobToCompletion(started.id);
  if (job.exportRows?.length) {
    if (action === "export_csv") {
      exportToCsv(`${moduleKey}-export.csv`, job.exportRows);
    } else if (action === "export_excel") {
      await exportToExcel(
        `${moduleKey}-export.xlsx`,
        moduleKey,
        job.exportRows
      );
    } else if (action === "export_pdf") {
      exportToCsv(`${moduleKey}-export.csv`, job.exportRows);
      appToast.info("PDF export", "CSV downloaded as printable fallback");
    }
  }
  if (action === "print") {
    window.print();
  }
  return job;
}

export async function runQuickAction(
  actionId: QuickActionId,
  records: QuickActionRecord[],
  moduleKey: string,
  deps: RunDeps
): Promise<{ ok: boolean; needsConfirm?: boolean }> {
  const def = ACTION_DEFS[actionId];
  if (!def) return { ok: false };
  if (!records.length) return { ok: false };

  const primary = records[0]!;
  const href =
    primary.href || viewHrefFor(moduleKey, primary.id);
  const editHref = primary.editHref || editHrefFor(moduleKey, primary.id);
  const ids = records.map((r) => r.id);

  try {
    switch (actionId) {
      case "view":
        deps.routerPush(href);
        return { ok: true };

      case "edit":
        if (records.length === 1) {
          deps.routerPush(editHref);
        } else {
          await runBulk(moduleKey, "edit", ids);
          appToast.success("Bulk edit started");
        }
        deps.onComplete?.();
        return { ok: true };

      case "duplicate":
        if (records.length === 1) {
          if (moduleKey === "invoices") {
            const res = await fetch(
              `/api/invoices/${primary.id}/duplicate`,
              { method: "POST" }
            );
            const json = await res.json();
            if (json.success && json.data?.id) {
              deps.routerPush(`/dashboard/invoices/${json.data.id}`);
            } else {
              deps.routerPush(duplicateHrefFor(moduleKey, primary.id));
            }
          } else {
            deps.routerPush(duplicateHrefFor(moduleKey, primary.id));
          }
        } else {
          await runBulk(moduleKey, "duplicate", ids);
          appToast.success("Duplicated");
        }
        deps.onComplete?.();
        return { ok: true };

      case "copy": {
        const text = `${primary.label}\n${absoluteUrl(href)}`;
        await navigator.clipboard.writeText(text);
        appToast.success("Copied");
        return { ok: true };
      }

      case "move":
        await runBulk(moduleKey, "move", ids);
        appToast.success("Moved");
        deps.onComplete?.();
        return { ok: true };

      case "archive":
        await runBulk(moduleKey, "archive", ids);
        appToast.success("Archived");
        deps.onComplete?.();
        return { ok: true };

      case "unarchive":
        await runBulk(moduleKey, "unarchive", ids);
        appToast.success("Unarchived");
        deps.onComplete?.();
        return { ok: true };

      case "soft_delete": {
        if (records.length === 1) {
          const url = deleteUrlFor(moduleKey, primary.id);
          if (!url) {
            appToast.error("Delete not available");
            return { ok: false };
          }
          const { softDeleteWithUndo } = await import("@/lib/delete/withUndo");
          const restore = restoreUrlFor(moduleKey, primary.id);
          await softDeleteWithUndo({
            deleteUrl: url,
            restoreUrl: restore || url,
            module: moduleKey as never,
            title: "Deleted",
            entityType: entityTypeFor(moduleKey),
            entityId: primary.id,
            onSoftDeleted: () => deps.onComplete?.(),
          });
        } else {
          await runBulk(moduleKey, "delete", ids);
          appToast.success("Deleted");
          deps.onComplete?.();
        }
        return { ok: true };
      }

      case "restore": {
        if (records.length === 1) {
          const url = restoreUrlFor(moduleKey, primary.id);
          if (!url) {
            appToast.error("Restore not available");
            return { ok: false };
          }
          const res = await fetch(url, { method: "POST" });
          const json = await res.json();
          if (!json.success) {
            appToast.error(json.message || "Restore failed");
            return { ok: false };
          }
          appToast.success("Restored");
        } else {
          await runBulk(moduleKey, "restore", ids);
          appToast.success("Restored");
        }
        deps.onComplete?.();
        return { ok: true };
      }

      case "print":
        if (moduleKey === "invoices" && records.length === 1) {
          window.open(
            `/api/invoices/${primary.id}/print`,
            "_blank",
            "noopener,noreferrer"
          );
        } else if (records.length > 1) {
          await runBulk(moduleKey, "print", ids);
        } else {
          window.print();
        }
        return { ok: true };

      case "export_pdf":
        await runBulk(moduleKey, "export_pdf", ids);
        appToast.success("Exported");
        return { ok: true };

      case "export_excel":
        await runBulk(moduleKey, "export_excel", ids);
        appToast.success("Exported");
        return { ok: true };

      case "export_csv":
        await runBulk(moduleKey, "export_csv", ids);
        appToast.success("Exported");
        return { ok: true };

      case "share": {
        const url = absoluteUrl(href);
        try {
          if (navigator.share) {
            await navigator.share({ title: primary.label, url });
          } else {
            await navigator.clipboard.writeText(url);
            appToast.success("Link ready to share");
          }
        } catch {
          /* cancelled */
        }
        return { ok: true };
      }

      case "copy_link":
        await navigator.clipboard.writeText(absoluteUrl(href));
        appToast.success("Link copied");
        return { ok: true };

      case "open_new_tab":
        window.open(href, "_blank", "noopener,noreferrer");
        return { ok: true };

      case "favorite": {
        const wasFav = deps.isFavorite?.(href);
        deps.toggleFavorite({
          href,
          title: primary.label,
          moduleKey,
          entityType: primary.entityType || entityTypeFor(moduleKey),
          entityId: primary.id,
        });
        appToast.success(
          wasFav ? "Removed from favorites" : "Added to favorites"
        );
        return { ok: true };
      }

      case "pin":
        if (deps.toggleHistoryPin) {
          await deps.toggleHistoryPin(href);
          appToast.success("Pin updated");
        } else {
          deps.toggleFavorite({
            href,
            title: primary.label,
            moduleKey,
            entityType: primary.entityType || entityTypeFor(moduleKey),
            entityId: primary.id,
          });
          appToast.success("Pinned via favorites");
        }
        return { ok: true };

      case "timeline":
        deps.routerPush(timelineHrefFor(moduleKey, primary.id));
        return { ok: true };

      case "audit":
        deps.routerPush(auditHrefFor(moduleKey, primary.id));
        return { ok: true };

      default:
        return { ok: false };
    }
  } catch (e) {
    console.error("Quick action error:", e);
    appToast.error(e instanceof Error ? e.message : "Action failed");
    return { ok: false };
  }
}
