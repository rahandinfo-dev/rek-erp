import { db } from "@/lib/prisma/db";
import type { Prisma } from "@/lib/prisma/client";
import { BATCH_SIZE, type BulkPayload } from "@/lib/bulk/types";
import { isActionAllowed } from "@/lib/bulk/modules";
import { processBulkItem, type ProcessResult } from "@/lib/bulk/process";
import { deleteUrlFor, restoreUrlFor } from "@/lib/bulk/urls";
import { auditSafe } from "@/lib/audit/log";
import { notifySafe } from "@/lib/notifications/create";

function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;
  try {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  } catch {
    return undefined;
  }
}

export async function createBulkJob(input: {
  companyId: string;
  userId: string;
  moduleKey: string;
  action: string;
  ids: string[];
  payload?: BulkPayload;
}) {
  if (!isActionAllowed(input.moduleKey, input.action)) {
    throw new Error("Action not allowed for this module");
  }
  const ids = Array.from(new Set(input.ids.filter(Boolean)));
  if (ids.length === 0) throw new Error("No records selected");
  if (ids.length > 2000) throw new Error("Maximum 2000 records per job");

  const canUndo = [
    "delete",
    "archive",
    "unarchive",
    "change_status",
    "assign_category",
    "edit",
    "add_tags",
    "move",
  ].includes(input.action);

  const job = await db.bulkJob.create({
    data: {
      companyId: input.companyId,
      userId: input.userId,
      moduleKey: input.moduleKey,
      action: input.action,
      status: "pending",
      totalCount: ids.length,
      payload: toJson(input.payload || {}),
      canUndo,
      items: {
        create: ids.map((entityId) => ({
          entityId,
          status: "pending",
        })),
      },
    },
  });

  await auditSafe({
    companyId: input.companyId,
    userId: input.userId,
    module: "SYSTEM",
    action: "OTHER",
    entityType: "BulkJob",
    entityId: job.id,
    summary: `Bulk ${input.action} started on ${input.moduleKey} (${ids.length})`,
    metadata: {
      bulk: true,
      moduleKey: input.moduleKey,
      action: input.action,
      total: ids.length,
    },
  });

  return job;
}

export async function processBulkJobBatch(input: {
  companyId: string;
  userId: string;
  jobId: string;
  cookie?: string;
  origin?: string;
  batchSize?: number;
}) {
  const job = await db.bulkJob.findFirst({
    where: { id: input.jobId, companyId: input.companyId },
  });
  if (!job) throw new Error("Job not found");

  if (["completed", "failed", "cancelled"].includes(job.status) && !job.cancelRequested) {
    return serializeJob(job.id);
  }

  if (job.status === "pending") {
    await db.bulkJob.update({
      where: { id: job.id },
      data: { status: "processing", startedAt: new Date() },
    });
  }

  const batchSize = input.batchSize || BATCH_SIZE;
  const pending = await db.bulkJobItem.findMany({
    where: { jobId: job.id, status: "pending" },
    take: batchSize,
    orderBy: { createdAt: "asc" },
  });

  if (job.cancelRequested) {
    await db.bulkJobItem.updateMany({
      where: { jobId: job.id, status: "pending" },
      data: { status: "cancelled", message: "Cancelled by user" },
    });
    const cancelled = await db.bulkJobItem.count({
      where: { jobId: job.id, status: "cancelled" },
    });
    await db.bulkJob.update({
      where: { id: job.id },
      data: {
        status: "cancelled",
        cancelledCount: cancelled,
        finishedAt: new Date(),
      },
    });
    return serializeJob(job.id);
  }

  if (pending.length === 0) {
    return finalizeJob(job.id, input.companyId, input.userId);
  }

  const payload = (job.payload || {}) as BulkPayload;
  const exportRows: Array<Record<string, string | number | null>> = [];
  const undoItems: Array<{ entityId: string; undo: unknown }> = [];

  for (const item of pending) {
    // Re-check cancel between items
    const fresh = await db.bulkJob.findUnique({
      where: { id: job.id },
      select: { cancelRequested: true },
    });
    if (fresh?.cancelRequested) {
      await db.bulkJobItem.update({
        where: { id: item.id },
        data: { status: "cancelled", message: "Cancelled by user" },
      });
      continue;
    }

    await db.bulkJobItem.update({
      where: { id: item.id },
      data: { status: "processing" },
    });

    let result: ProcessResult;
    if (
      (job.action === "delete" || job.action === "restore") &&
      input.cookie &&
      input.origin
    ) {
      result = await httpDeleteOrRestore({
        action: job.action as "delete" | "restore",
        moduleKey: job.moduleKey,
        entityId: item.entityId,
        cookie: input.cookie,
        origin: input.origin,
      });
    } else {
      result = await processBulkItem(
        {
          companyId: input.companyId,
          userId: input.userId,
          moduleKey: job.moduleKey,
          action: job.action,
          payload,
        },
        item.entityId
      );
    }

    if (result.exportRow) exportRows.push(result.exportRow);
    if (result.undo) {
      undoItems.push({ entityId: item.entityId, undo: result.undo });
    }

    await db.bulkJobItem.update({
      where: { id: item.id },
      data: {
        status: result.status,
        message: result.message || null,
        entityLabel:
          typeof result.before === "object" &&
          result.before &&
          "label" in (result.before as object)
            ? String((result.before as { label?: string }).label)
            : item.entityLabel,
        before: toJson(result.before),
        after: toJson(result.after),
      },
    });

    // Version history for archive / unarchive (soft mutations without entity audit)
    if (
      result.status === "success" &&
      (job.action === "archive" || job.action === "unarchive")
    ) {
      const { entityTypeFor } = await import("@/lib/bulk/modules");
      const { captureEntityVersionSafe } = await import(
        "@/lib/versions/capture"
      );
      captureEntityVersionSafe({
        companyId: input.companyId,
        userId: input.userId,
        entityType: entityTypeFor(job.moduleKey),
        entityId: item.entityId,
        action: job.action === "archive" ? "ARCHIVE" : "UNARCHIVE",
        summary: result.message || `${job.action} ${item.entityId}`,
        oldValue: result.before,
        newValue: result.after,
      });
    }

    await db.bulkJob.update({
      where: { id: job.id },
      data: {
        processedCount: { increment: 1 },
        successCount: result.status === "success" ? { increment: 1 } : undefined,
        failedCount: result.status === "failed" ? { increment: 1 } : undefined,
        skippedCount: result.status === "skipped" ? { increment: 1 } : undefined,
      },
    });
  }

  // Merge export/undo into job summary/undoPayload
  if (exportRows.length || undoItems.length) {
    const current = await db.bulkJob.findUnique({ where: { id: job.id } });
    const prevSummary = (current?.summary || {}) as Record<string, unknown>;
    const prevExport = Array.isArray(prevSummary.exportRows)
      ? (prevSummary.exportRows as Array<Record<string, string | number | null>>)
      : [];
    const prevUndo = Array.isArray(current?.undoPayload)
      ? (current!.undoPayload as Array<{ entityId: string; undo: unknown }>)
      : [];

    await db.bulkJob.update({
      where: { id: job.id },
      data: {
        summary: toJson({
          ...prevSummary,
          exportRows: [...prevExport, ...exportRows],
        }),
        undoPayload: toJson([...prevUndo, ...undoItems]),
      },
    });
  }

  const remaining = await db.bulkJobItem.count({
    where: { jobId: job.id, status: "pending" },
  });
  if (remaining === 0) {
    return finalizeJob(job.id, input.companyId, input.userId);
  }

  return serializeJob(job.id);
}

async function httpDeleteOrRestore(input: {
  action: "delete" | "restore";
  moduleKey: string;
  entityId: string;
  cookie: string;
  origin: string;
}): Promise<ProcessResult> {
  const path =
    input.action === "delete"
      ? deleteUrlFor(input.moduleKey, input.entityId)
      : restoreUrlFor(input.moduleKey, input.entityId);
  if (!path) {
    return {
      status: "skipped" as const,
      message: "Endpoint not available",
    };
  }
  try {
    const res = await fetch(new URL(path, input.origin).toString(), {
      method: input.action === "delete" ? "DELETE" : "POST",
      headers: {
        cookie: input.cookie,
        "content-type": "application/json",
      },
    });
    let json: { success?: boolean; message?: string } = {};
    try {
      json = await res.json();
    } catch {
      /* ignore */
    }
    if (!res.ok || json.success === false) {
      return {
        status: (res.status === 401 || res.status === 403
          ? "skipped"
          : "failed") as "skipped" | "failed",
        message: json.message || `HTTP ${res.status}`,
      };
    }
    return {
      status: "success" as const,
      message: json.message || (input.action === "delete" ? "Deleted" : "Restored"),
      undo: input.action === "delete" ? { action: "restore" } : undefined,
    };
  } catch (error) {
    return {
      status: "failed" as const,
      message: error instanceof Error ? error.message : "Request failed",
    };
  }
}

async function finalizeJob(
  jobId: string,
  companyId: string,
  userId: string
) {
  const counts = await db.bulkJobItem.groupBy({
    by: ["status"],
    where: { jobId },
    _count: { _all: true },
  });
  const map = Object.fromEntries(
    counts.map((c) => [c.status, c._count._all])
  ) as Record<string, number>;

  const success = map.success || 0;
  const failed = map.failed || 0;
  const skipped = map.skipped || 0;
  const cancelled = map.cancelled || 0;
  const total = success + failed + skipped + cancelled;

  let status: string = "completed";
  if (cancelled > 0 && success === 0) status = "cancelled";
  else if (failed > 0 && success === 0 && skipped === 0) status = "failed";
  else if (failed > 0 || skipped > 0 || cancelled > 0) status = "partial";

  const job = await db.bulkJob.update({
    where: { id: jobId },
    data: {
      status,
      successCount: success,
      failedCount: failed,
      skippedCount: skipped,
      cancelledCount: cancelled,
      processedCount: total,
      finishedAt: new Date(),
    },
  });

  await auditSafe({
    companyId,
    userId,
    module: "SYSTEM",
    action: "OTHER",
    entityType: "BulkJob",
    entityId: jobId,
    summary: `Bulk ${job.action} finished Â· ${success} ok Â· ${failed} failed Â· ${skipped} skipped`,
    status: failed > 0 ? "warning" : "success",
    metadata: {
      bulk: true,
      moduleKey: job.moduleKey,
      action: job.action,
      success,
      failed,
      skipped,
      cancelled,
    },
  });

  void notifySafe({
    companyId,
    userId,
    title: "Bulk operation finished",
    message: `${job.action} on ${job.moduleKey}: ${success} succeeded, ${failed} failed, ${skipped} skipped.`,
    category: "SYSTEM",
    href: "/dashboard/bulk",
    entityType: "BulkJob",
    entityId: jobId,
  });

  return serializeJob(jobId);
}

export async function cancelBulkJob(companyId: string, jobId: string) {
  const job = await db.bulkJob.findFirst({
    where: { id: jobId, companyId },
  });
  if (!job) throw new Error("Job not found");
  await db.bulkJob.update({
    where: { id: jobId },
    data: { cancelRequested: true },
  });
  return serializeJob(jobId);
}

export async function undoBulkJob(input: {
  companyId: string;
  userId: string;
  jobId: string;
  cookie?: string;
  origin?: string;
}) {
  const job = await db.bulkJob.findFirst({
    where: { id: input.jobId, companyId: input.companyId },
  });
  if (!job) throw new Error("Job not found");
  if (!job.canUndo || job.undoneAt) {
    throw new Error("Undo not available");
  }

  const items = await db.bulkJobItem.findMany({
    where: { jobId: job.id, status: "success" },
  });

  let restored = 0;
  let failed = 0;

  if (job.action === "delete" && input.cookie && input.origin) {
    for (const item of items) {
      const path = restoreUrlFor(job.moduleKey, item.entityId);
      if (!path) {
        failed += 1;
        continue;
      }
      try {
        const res = await fetch(new URL(path, input.origin).toString(), {
          method: "POST",
          headers: {
            cookie: input.cookie,
            "content-type": "application/json",
          },
        });
        if (res.ok) restored += 1;
        else failed += 1;
      } catch {
        failed += 1;
      }
    }
  } else {
    // Best-effort reverse using before snapshots for non-delete actions
    for (const item of items) {
      try {
        if (job.action === "archive" || job.action === "unarchive") {
          const before = item.before as { archived?: boolean } | null;
          const { upsertEntityMeta } = await import("@/lib/bulk/meta");
          const { entityTypeFor } = await import("@/lib/bulk/modules");
          await upsertEntityMeta(
            input.companyId,
            entityTypeFor(job.moduleKey),
            item.entityId,
            { archived: before?.archived ?? false }
          );
          restored += 1;
        } else if (
          job.action === "change_status" &&
          ["products", "customers", "suppliers", "warehouses", "categories", "brands", "units"].includes(
            job.moduleKey
          )
        ) {
          const before = item.before as { active?: boolean } | null;
          if (typeof before?.active === "boolean") {
            await processBulkItem(
              {
                companyId: input.companyId,
                userId: input.userId,
                moduleKey: job.moduleKey,
                action: "change_status",
                payload: { active: before.active },
              },
              item.entityId
            );
            restored += 1;
          } else failed += 1;
        } else {
          failed += 1;
        }
      } catch {
        failed += 1;
      }
    }
  }

  await db.bulkJob.update({
    where: { id: job.id },
    data: { undoneAt: new Date(), canUndo: false },
  });

  await auditSafe({
    companyId: input.companyId,
    userId: input.userId,
    module: "SYSTEM",
    action: "UNDO",
    entityType: "BulkJob",
    entityId: job.id,
    summary: `Bulk undo Â· ${restored} restored Â· ${failed} failed`,
    metadata: { bulk: true, restored, failed },
  });

  return { restored, failed, job: await serializeJob(job.id) };
}

export async function serializeJob(jobId: string) {
  const job = await db.bulkJob.findUnique({
    where: { id: jobId },
    include: {
      items: {
        orderBy: { createdAt: "asc" },
        take: 100,
      },
    },
  });
  if (!job) return null;

  const summary = (job.summary || {}) as Record<string, unknown>;
  return {
    id: job.id,
    moduleKey: job.moduleKey,
    action: job.action,
    status: job.status,
    totalCount: job.totalCount,
    processedCount: job.processedCount,
    successCount: job.successCount,
    failedCount: job.failedCount,
    skippedCount: job.skippedCount,
    cancelledCount: job.cancelledCount,
    canUndo: job.canUndo && !job.undoneAt,
    undoneAt: job.undoneAt?.getTime() ?? null,
    cancelRequested: job.cancelRequested,
    payload: job.payload,
    summary,
    exportRows: Array.isArray(summary.exportRows)
      ? summary.exportRows
      : undefined,
    createdAt: job.createdAt.getTime(),
    startedAt: job.startedAt?.getTime() ?? null,
    finishedAt: job.finishedAt?.getTime() ?? null,
    items: job.items.map((i) => ({
      id: i.id,
      entityId: i.entityId,
      entityLabel: i.entityLabel,
      status: i.status,
      message: i.message,
    })),
  };
}
