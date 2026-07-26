import { Prisma } from "@/lib/prisma/client";
import { db } from "@/lib/prisma/db";
import { versionRecordHref } from "@/lib/versions/urls";
import { splitDateTime as formatDateTimeParts } from "@/lib/utils/datetime";
import type {
  ChangedField,
  EntityVersionRow,
  VersionQuery,
} from "@/lib/versions/types";

function splitDateTime(d: Date) {
  return {
    ...formatDateTimeParts(d),
    createdAt: d.toISOString(),
  };
}

function mapChanged(raw: unknown): ChangedField[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x) => x && typeof x === "object")
    .map((x) => {
      const o = x as Record<string, unknown>;
      return {
        field: String(o.field || "field"),
        before: o.before,
        after: o.after,
      };
    });
}

function mapRow(r: {
  id: string;
  companyId: string;
  entityType: string;
  entityId: string;
  versionNumber: number;
  recordName: string;
  userId: string | null;
  userName: string | null;
  action: string;
  changedFields: unknown;
  beforeValue: unknown;
  afterValue: unknown;
  comment: string | null;
  auditLogId: string | null;
  createdAt: Date;
}): EntityVersionRow {
  const dt = splitDateTime(r.createdAt);
  return {
    id: r.id,
    companyId: r.companyId,
    entityType: r.entityType,
    entityId: r.entityId,
    versionNumber: r.versionNumber,
    recordName: r.recordName,
    userId: r.userId,
    userName: r.userName,
    action: r.action,
    changedFields: mapChanged(r.changedFields),
    beforeValue: r.beforeValue,
    afterValue: r.afterValue,
    comment: r.comment,
    auditLogId: r.auditLogId,
    href: versionRecordHref(r.entityType, r.entityId),
    ...dt,
  };
}

const select = {
  id: true,
  companyId: true,
  entityType: true,
  entityId: true,
  versionNumber: true,
  recordName: true,
  userId: true,
  userName: true,
  action: true,
  changedFields: true,
  beforeValue: true,
  afterValue: true,
  comment: true,
  auditLogId: true,
  createdAt: true,
} as const;

export async function queryVersions(input: VersionQuery) {
  const page = Math.max(1, input.page || 1);
  const pageSize = Math.min(100, Math.max(1, input.pageSize || 25));
  const q = (input.q || "").trim();

  const where: Prisma.EntityVersionWhereInput = {
    companyId: input.companyId,
  };

  if (input.entityType) where.entityType = input.entityType;
  if (input.entityId) where.entityId = input.entityId;
  if (input.action) where.action = input.action;
  if (input.userId) where.userId = input.userId;

  if (input.from || input.to) {
    where.createdAt = {};
    if (input.from) where.createdAt.gte = new Date(input.from);
    if (input.to) {
      const to = new Date(input.to);
      to.setHours(23, 59, 59, 999);
      where.createdAt.lte = to;
    }
  }

  if (q) {
    where.OR = [
      { recordName: { contains: q, mode: "insensitive" } },
      { userName: { contains: q, mode: "insensitive" } },
      { comment: { contains: q, mode: "insensitive" } },
      { entityId: { contains: q, mode: "insensitive" } },
      { entityType: { contains: q, mode: "insensitive" } },
      { action: { contains: q, mode: "insensitive" } },
    ];
  }

  let orderBy: Prisma.EntityVersionOrderByWithRelationInput = {
    createdAt: "desc",
  };
  switch (input.sort) {
    case "oldest":
      orderBy = { createdAt: "asc" };
      break;
    case "version_asc":
      orderBy = { versionNumber: "asc" };
      break;
    case "version_desc":
      orderBy = { versionNumber: "desc" };
      break;
    default:
      orderBy = { createdAt: "desc" };
  }

  const [total, rows] = await Promise.all([
    db.entityVersion.count({ where }),
    db.entityVersion.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select,
    }),
  ]);

  return {
    items: rows.map(mapRow),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      hasMore: page * pageSize < total,
    },
  };
}

export async function getVersionById(companyId: string, id: string) {
  const row = await db.entityVersion.findFirst({
    where: { id, companyId },
    select,
  });
  return row ? mapRow(row) : null;
}

export async function queryEntityVersionChain(
  companyId: string,
  entityType: string,
  entityId: string,
  take = 50
) {
  const rows = await db.entityVersion.findMany({
    where: { companyId, entityType, entityId },
    orderBy: { versionNumber: "desc" },
    take,
    select,
  });
  return rows.map(mapRow);
}

export async function loadVersionFilters(companyId: string) {
  const [users, entityTypes] = await Promise.all([
    db.user.findMany({
      where: { companyId },
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
      take: 300,
    }),
    db.entityVersion.findMany({
      where: { companyId },
      distinct: ["entityType"],
      select: { entityType: true },
      take: 50,
    }),
  ]);
  return {
    users,
    entityTypes: entityTypes.map((e) => e.entityType),
  };
}

export async function versionStats(companyId: string) {
  const since = new Date(Date.now() - 7 * 86400000);

  const [recent, restores, topEdited] = await Promise.all([
    db.entityVersion.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 8,
      select,
    }),
    db.entityVersion.findMany({
      where: { companyId, action: "RESTORE" },
      orderBy: { createdAt: "desc" },
      take: 8,
      select,
    }),
    db.entityVersion.groupBy({
      by: ["entityType", "entityId", "recordName"],
      where: {
        companyId,
        createdAt: { gte: since },
        action: { in: ["UPDATE", "RESTORE", "ARCHIVE"] },
      },
      _count: { _all: true },
    }),
  ]);

  const mostEdited = [...topEdited]
    .sort((a, b) => b._count._all - a._count._all)
    .slice(0, 8)
    .map((g) => ({
      entityType: g.entityType,
      entityId: g.entityId,
      recordName: g.recordName,
      edits: g._count._all,
      href: versionRecordHref(g.entityType, g.entityId),
    }));

  return {
    recent: recent.map(mapRow),
    restoreHistory: restores.map(mapRow),
    mostEdited,
  };
}
