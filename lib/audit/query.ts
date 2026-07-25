import { Prisma } from "@/app/generated/prisma/client";
import { db } from "@/lib/prisma/db";
import { recordDisplayName } from "@/lib/audit/diff";
import { splitDateTime as formatDateTimeParts } from "@/lib/utils/datetime";

export type AuditLogRow = {
  id: string;
  module: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  summary: string | null;
  recordName: string;
  oldValue: unknown;
  newValue: unknown;
  status: string;
  ipAddress: string | null;
  userAgent: string | null;
  device: string | null;
  userName: string | null;
  userId: string | null;
  metadata: unknown;
  createdAt: string;
  date: string;
  time: string;
};

export type AuditLogQuery = {
  companyId: string;
  /** Restrict to current user (My Activity) */
  scopeUserId?: string;
  q?: string;
  module?: string;
  action?: string;
  userId?: string;
  device?: string;
  status?: string;
  from?: string;
  to?: string;
  /** ISO — fetch only newer than this (realtime poll) */
  since?: string;
  /** Cursor pagination — createdAt ISO of last item */
  cursor?: string;
  page?: number;
  pageSize?: number;
  sort?: "newest" | "oldest";
};

function splitDateTime(d: Date) {
  return {
    ...formatDateTimeParts(d),
    createdAt: d.toISOString(),
  };
}

function mapRow(r: {
  id: string;
  module: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  summary: string | null;
  oldValue: unknown;
  newValue: unknown;
  status: string;
  ipAddress: string | null;
  userAgent: string | null;
  device: string | null;
  userName: string | null;
  userId: string | null;
  metadata: unknown;
  createdAt: Date;
}): AuditLogRow {
  const dt = splitDateTime(r.createdAt);
  return {
    id: r.id,
    module: r.module,
    action: r.action,
    entityType: r.entityType,
    entityId: r.entityId,
    summary: r.summary,
    recordName: recordDisplayName(r),
    oldValue: r.oldValue,
    newValue: r.newValue,
    status: r.status || "success",
    ipAddress: r.ipAddress,
    userAgent: r.userAgent,
    device: r.device,
    userName: r.userName,
    userId: r.userId,
    metadata: r.metadata,
    ...dt,
  };
}

/** Permanent audit ledger query — searchable & filterable. No deletes. */
export async function queryAuditLogs(input: AuditLogQuery) {
  const page = Math.max(1, input.page || 1);
  const pageSize = Math.min(100, Math.max(1, input.pageSize || 25));
  const q = (input.q || "").trim();
  const sortDesc = input.sort !== "oldest";

  const where: Prisma.AuditLogWhereInput = {
    companyId: input.companyId,
  };

  if (input.scopeUserId) where.userId = input.scopeUserId;
  if (input.module) where.module = input.module;
  if (input.action) where.action = input.action;
  if (input.userId) where.userId = input.userId;
  if (input.device) where.device = input.device;
  if (input.status) where.status = input.status;

  if (input.from || input.to || input.since || input.cursor) {
    where.createdAt = {};
    if (input.from) {
      const from = new Date(input.from);
      if (!Number.isNaN(from.getTime())) where.createdAt.gte = from;
    }
    if (input.since) {
      const since = new Date(input.since);
      if (!Number.isNaN(since.getTime())) {
        where.createdAt.gt = since;
      }
    }
    if (input.to) {
      const to = new Date(input.to);
      if (!Number.isNaN(to.getTime())) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(input.to)) {
          to.setHours(23, 59, 59, 999);
        }
        where.createdAt.lte = to;
      }
    }
    if (input.cursor) {
      const cur = new Date(input.cursor);
      if (!Number.isNaN(cur.getTime())) {
        if (sortDesc) where.createdAt.lt = cur;
        else where.createdAt.gt = cur;
      }
    }
  }

  if (q) {
    where.OR = [
      { summary: { contains: q, mode: "insensitive" } },
      { module: { contains: q, mode: "insensitive" } },
      { action: { contains: q, mode: "insensitive" } },
      { entityType: { contains: q, mode: "insensitive" } },
      { entityId: { contains: q, mode: "insensitive" } },
      { userName: { contains: q, mode: "insensitive" } },
      { ipAddress: { contains: q, mode: "insensitive" } },
      { device: { contains: q, mode: "insensitive" } },
      { userAgent: { contains: q, mode: "insensitive" } },
      { status: { contains: q, mode: "insensitive" } },
    ];
  }

  const select = {
    id: true,
    module: true,
    action: true,
    entityType: true,
    entityId: true,
    summary: true,
    oldValue: true,
    newValue: true,
    status: true,
    ipAddress: true,
    userAgent: true,
    device: true,
    userName: true,
    userId: true,
    metadata: true,
    createdAt: true,
  } as const;

  // Cursor mode skips total count for speed (infinite scroll)
  if (input.cursor || input.since) {
    const rows = await db.auditLog.findMany({
      where,
      orderBy: { createdAt: sortDesc ? "desc" : "asc" },
      take: pageSize,
      select,
    });
    const items = rows.map(mapRow);
    return {
      items,
      pagination: {
        page: 1,
        pageSize,
        total: items.length,
        totalPages: 1,
        nextCursor: items.length
          ? items[items.length - 1].createdAt
          : null,
        hasMore: items.length === pageSize,
      },
    };
  }

  const [total, rows] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: sortDesc ? "desc" : "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select,
    }),
  ]);

  const items = rows.map(mapRow);

  return {
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      nextCursor: items.length
        ? items[items.length - 1].createdAt
        : null,
      hasMore: page * pageSize < total,
    },
  };
}

export async function getAuditLogById(companyId: string, id: string) {
  const row = await db.auditLog.findFirst({
    where: { id, companyId },
  });
  if (!row) return null;
  return mapRow(row);
}

/** Entity version chain for compare/restore. */
export async function queryEntityVersions(
  companyId: string,
  entityType: string,
  entityId: string,
  take = 30
) {
  const rows = await db.auditLog.findMany({
    where: {
      companyId,
      entityType,
      entityId,
    },
    orderBy: { createdAt: "desc" },
    take,
  });
  return rows.map(mapRow);
}

export async function loadAuditLogFilters(companyId: string) {
  const users = await db.user.findMany({
    where: { companyId },
    select: { id: true, fullName: true },
    orderBy: { fullName: "asc" },
    take: 300,
  });
  return { users };
}
