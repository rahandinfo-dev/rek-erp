import type { Prisma } from "@/app/generated/prisma/client";
import { db } from "@/lib/prisma/db";
import { compareValues, recordDisplayName } from "@/lib/audit/diff";
import { normalizeEntityType } from "@/lib/versions/urls";
import type { ChangedField, VersionAction } from "@/lib/versions/types";

const VERSIONABLE = new Set([
  "CREATE",
  "UPDATE",
  "RESTORE",
  "ARCHIVE",
  "UNARCHIVE",
  "DELETE",
]);

function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;
  try {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  } catch {
    return { note: "unserializable" };
  }
}

export type CaptureVersionInput = {
  companyId: string;
  userId?: string | null;
  userName?: string | null;
  entityType: string;
  entityId: string;
  action: string;
  summary?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  comment?: string | null;
  auditLogId?: string | null;
  status?: string;
};

/**
 * Append an immutable EntityVersion. Never throws to callers.
 * Version numbers are monotonic per entity via max+1 (indexed unique).
 */
export async function captureEntityVersion(
  input: CaptureVersionInput
): Promise<string | null> {
  try {
    if ((input.status || "success") !== "success") return null;
    const action = String(input.action).toUpperCase();
    if (!VERSIONABLE.has(action)) return null;
    if (!input.entityId || !input.entityType) return null;

    const entityType = normalizeEntityType(input.entityType);
    const entityId = input.entityId;

    const last = await db.entityVersion.findFirst({
      where: {
        companyId: input.companyId,
        entityType,
        entityId,
      },
      orderBy: { versionNumber: "desc" },
      select: { versionNumber: true },
    });
    const versionNumber = (last?.versionNumber || 0) + 1;

    const diffs = compareValues(input.oldValue, input.newValue);
    const changedFields: ChangedField[] = diffs.map((d) => ({
      field: d.field,
      before: d.before,
      after: d.after,
    }));

    const recordName = recordDisplayName({
      summary: input.summary,
      entityType,
      entityId,
      newValue: input.newValue,
      oldValue: input.oldValue,
    });

    let userName = input.userName ?? null;
    if (!userName && input.userId) {
      const user = await db.user.findUnique({
        where: { id: input.userId },
        select: { fullName: true, username: true },
      });
      userName = user?.fullName || user?.username || null;
    }

    const row = await db.entityVersion.create({
      data: {
        companyId: input.companyId,
        entityType,
        entityId,
        versionNumber,
        recordName,
        userId: input.userId ?? null,
        userName,
        action: action as VersionAction,
        changedFields: changedFields as unknown as Prisma.InputJsonValue,
        beforeValue: toJson(input.oldValue),
        afterValue: toJson(input.newValue),
        comment: input.comment ?? null,
        auditLogId: input.auditLogId ?? null,
      },
    });

    return row.id;
  } catch (error) {
    console.error("CAPTURE ENTITY VERSION ERROR:", error);
    return null;
  }
}

/** Fire-and-forget wrapper for audit chokepoint */
export function captureEntityVersionSafe(input: CaptureVersionInput): void {
  void captureEntityVersion(input);
}
