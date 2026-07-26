import type { NextRequest } from "next/server";
import type { Prisma } from "@/lib/prisma/client";
import { db } from "@/lib/prisma/db";
import { getRequestAuditMeta } from "@/lib/audit/request";
import type { AuditAction, AuditModule } from "@/lib/audit/modules";
import {
  recordRecycleDelete,
  recordRecyclePurged,
  recordRecycleRestore,
} from "@/lib/recycle/record";
import { captureEntityVersionSafe } from "@/lib/versions/capture";

export type AuditLogInput = {
  companyId: string;
  userId?: string | null;
  userName?: string | null;
  module: AuditModule;
  action: AuditAction;
  entityType?: string | null;
  entityId?: string | null;
  summary?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  /** success | failed | pending | warning */
  status?: "success" | "failed" | "pending" | "warning" | string;
  ipAddress?: string | null;
  userAgent?: string | null;
  device?: string | null;
  metadata?: Prisma.InputJsonValue;
  /** Optional request â€” fills IP / UA / device when not set */
  req?: NextRequest | Request | null;
};

function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) return undefined;
  if (value === null) return undefined;
  try {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  } catch {
    return { note: "unserializable" };
  }
}

/**
 * Append-only audit row. Never throws to the caller â€” logging must not
 * break business mutations. Rows are permanent (no delete API).
 */
export async function createAuditLog(input: AuditLogInput) {
  try {
    const meta = input.req ? getRequestAuditMeta(input.req) : null;
    let userName = input.userName ?? null;

    if (!userName && input.userId) {
      const user = await db.user.findUnique({
        where: { id: input.userId },
        select: { fullName: true, username: true },
      });
      userName = user?.fullName || user?.username || null;
    }

    const row = await db.auditLog.create({
      data: {
        companyId: input.companyId,
        userId: input.userId ?? null,
        userName,
        module: String(input.module),
        action: String(input.action),
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        summary: input.summary ?? null,
        oldValue: toJson(input.oldValue),
        newValue: toJson(input.newValue),
        status: input.status || "success",
        ipAddress: input.ipAddress ?? meta?.ipAddress ?? null,
        userAgent: input.userAgent ?? meta?.userAgent ?? null,
        device: input.device ?? meta?.device ?? null,
        metadata: input.metadata,
      },
    });

    // Recycle Bin ledger â€” never breaks audit write
    const action = String(input.action);
    const metaObj =
      input.metadata && typeof input.metadata === "object"
        ? (input.metadata as Record<string, unknown>)
        : null;
    const isPermanent = metaObj?.permanent === true;

    if (
      action === "DELETE" &&
      (input.status || "success") === "success" &&
      input.entityId
    ) {
      if (isPermanent) {
        void recordRecyclePurged({
          companyId: input.companyId,
          entityType: input.entityType || String(input.module),
          entityId: input.entityId,
        });
      } else {
        void recordRecycleDelete({
          companyId: input.companyId,
          userId: input.userId,
          userName,
          module: String(input.module),
          entityType: input.entityType,
          entityId: input.entityId,
          summary: input.summary,
          oldValue: input.oldValue,
          newValue: input.newValue,
        });
      }
    }
    if (
      action === "RESTORE" &&
      (input.status || "success") === "success" &&
      input.entityId
    ) {
      void recordRecycleRestore({
        companyId: input.companyId,
        entityType: input.entityType,
        entityId: input.entityId,
        userId: input.userId,
      });
    }

    // Enterprise version history â€” CREATE / UPDATE / RESTORE / ARCHIVE / DELETE
    if (
      input.entityId &&
      input.entityType &&
      (input.status || "success") === "success"
    ) {
      const metaComment =
        metaObj && typeof metaObj.comment === "string"
          ? metaObj.comment
          : null;
      captureEntityVersionSafe({
        companyId: input.companyId,
        userId: input.userId,
        userName,
        entityType: input.entityType,
        entityId: input.entityId,
        action,
        summary: input.summary,
        oldValue: input.oldValue,
        newValue: input.newValue,
        comment: metaComment,
        auditLogId: row.id,
        status: input.status || "success",
      });
    }

    return row;
  } catch (error) {
    console.error("CREATE AUDIT LOG ERROR:", error);
    return null;
  }
}

export async function auditSafe(input: AuditLogInput): Promise<void> {
  await createAuditLog(input);
}
