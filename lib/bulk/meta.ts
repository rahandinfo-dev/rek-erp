import { db } from "@/lib/prisma/db";
import type { Prisma } from "@/lib/prisma/client";

export async function getEntityMeta(
  companyId: string,
  entityType: string,
  entityId: string
) {
  return db.entityMeta.findUnique({
    where: {
      companyId_entityType_entityId: { companyId, entityType, entityId },
    },
  });
}

export async function upsertEntityMeta(
  companyId: string,
  entityType: string,
  entityId: string,
  patch: { tags?: string[]; archived?: boolean }
) {
  const existing = await getEntityMeta(companyId, entityType, entityId);
  const prevTags = Array.isArray(existing?.tags)
    ? (existing!.tags as string[])
    : [];
  const nextTags =
    patch.tags !== undefined
      ? Array.from(new Set([...prevTags, ...patch.tags]))
      : prevTags;

  return db.entityMeta.upsert({
    where: {
      companyId_entityType_entityId: { companyId, entityType, entityId },
    },
    create: {
      companyId,
      entityType,
      entityId,
      tags: nextTags as Prisma.InputJsonValue,
      archived: patch.archived ?? false,
    },
    update: {
      ...(patch.tags !== undefined
        ? { tags: nextTags as Prisma.InputJsonValue }
        : {}),
      ...(patch.archived !== undefined ? { archived: patch.archived } : {}),
    },
  });
}
