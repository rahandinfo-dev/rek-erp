import { db } from "@/lib/prisma/db";
import type { Prisma } from "@/lib/prisma/client";
import {
  moduleFromAudit,
  nameFromAuditValues,
} from "@/lib/recycle/map";
import { notifySafe } from "@/lib/notifications/create";
import { tServer } from "@/lib/i18n";

const t = tServer.t.bind(tServer);

export async function getRetentionDays(
  companyId: string,
  userId?: string | null
): Promise<number> {
  if (userId) {
    const prefs = await db.recycleBinPrefs.findUnique({
      where: { userId },
    });
    if (prefs?.retentionDays) return prefs.retentionDays;
  }
  // Company default: first prefs or 30
  const any = await db.recycleBinPrefs.findFirst({
    where: { companyId },
    orderBy: { updatedAt: "desc" },
  });
  return any?.retentionDays || 30;
}

export async function recordRecycleDelete(input: {
  companyId: string;
  userId?: string | null;
  userName?: string | null;
  module: string;
  entityType?: string | null;
  entityId?: string | null;
  summary?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string | null;
  relatedJson?: unknown;
}): Promise<void> {
  try {
    if (!input.entityId) return;
    const entityType = input.entityType || input.module;
    const moduleKey = moduleFromAudit(input.module, entityType);
    const retention = await getRetentionDays(input.companyId, input.userId);
    const deletedAt = new Date();
    const expiresAt = new Date(
      deletedAt.getTime() + retention * 86400000
    );
    const name = nameFromAuditValues(
      input.summary,
      input.oldValue,
      input.newValue
    );

    await db.recycleBinEntry.upsert({
      where: {
        companyId_entityType_entityId: {
          companyId: input.companyId,
          entityType,
          entityId: input.entityId,
        },
      },
      create: {
        companyId: input.companyId,
        userId: input.userId ?? null,
        userName: input.userName ?? null,
        moduleKey,
        entityType,
        entityId: input.entityId,
        name,
        reason: input.reason ?? null,
        status: "deleted",
        relatedJson: (input.relatedJson as Prisma.InputJsonValue) || undefined,
        deletedAt,
        expiresAt,
      },
      update: {
        userId: input.userId ?? null,
        userName: input.userName ?? null,
        moduleKey,
        name,
        reason: input.reason ?? null,
        status: "deleted",
        relatedJson: (input.relatedJson as Prisma.InputJsonValue) || undefined,
        deletedAt,
        expiresAt,
        restoredAt: null,
        purgedAt: null,
      },
    });

    void notifySafe({
      companyId: input.companyId,
      userId: input.userId,
      title: t("recycle.movedTitle"),
      message: t("recycle.movedMessage", { name, days: retention }),
      category: "SYSTEM",
      href: "/dashboard/recycle-bin",
      entityType,
      entityId: input.entityId,
    });
  } catch (error) {
    console.error("RECYCLE BIN RECORD DELETE ERROR:", error);
  }
}

export async function recordRecycleRestore(input: {
  companyId: string;
  entityType?: string | null;
  entityId?: string | null;
  userId?: string | null;
}): Promise<void> {
  try {
    if (!input.entityId) return;
    const entityType = input.entityType || "Unknown";
    await db.recycleBinEntry.updateMany({
      where: {
        companyId: input.companyId,
        entityType,
        entityId: input.entityId,
        status: "deleted",
      },
      data: {
        status: "restored",
        restoredAt: new Date(),
      },
    });

    void notifySafe({
      companyId: input.companyId,
      userId: input.userId,
      title: t("recycle.restoredTitle"),
      message: t("recycle.restoredMessage"),
      category: "SYSTEM",
      href: "/dashboard/recycle-bin",
      entityType,
      entityId: input.entityId,
    });
  } catch (error) {
    console.error("RECYCLE BIN RECORD RESTORE ERROR:", error);
  }
}

export async function recordRecyclePurged(input: {
  companyId: string;
  entityType: string;
  entityId: string;
}): Promise<void> {
  try {
    await db.recycleBinEntry.updateMany({
      where: {
        companyId: input.companyId,
        entityType: input.entityType,
        entityId: input.entityId,
      },
      data: {
        status: "purged",
        purgedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("RECYCLE BIN RECORD PURGE ERROR:", error);
  }
}
