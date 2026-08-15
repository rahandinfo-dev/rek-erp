import {
  MODULE_LABELS,
  daysRemaining,
  type RecycleBinItem,
  type RecycleStatus,
} from "@/lib/recycle/types";
import {
  detailHrefFor,
  purgeUrlFor,
  restoreUrlFor,
} from "@/lib/recycle/map";
import type { RelatedCount } from "@/lib/recycle/related";

export type RecycleBinRow = {
  id: string;
  companyId: string;
  name: string;
  moduleKey: string;
  entityType: string;
  entityId: string;
  userId: string | null;
  userName: string | null;
  reason: string | null;
  status: string;
  relatedJson: unknown;
  deletedAt: Date;
  expiresAt: Date;
};

export function serializeRecycleEntry(
  row: RecycleBinRow,
  related?: RelatedCount[]
): RecycleBinItem {
  const deletedAt = row.deletedAt.getTime();
  const expiresAt = row.expiresAt.getTime();
  const fromJson = Array.isArray(row.relatedJson)
    ? (row.relatedJson as RelatedCount[])
    : [];

  return {
    id: row.id,
    companyId: row.companyId,
    name: row.name,
    moduleKey: row.moduleKey,
    moduleLabel: MODULE_LABELS[row.moduleKey] || row.moduleKey,
    entityType: row.entityType,
    entityId: row.entityId,
    deletedBy: row.userName,
    deletedById: row.userId,
    deletedAt,
    expiresAt,
    daysRemaining: daysRemaining(expiresAt),
    reason: row.reason,
    status: (row.status as RecycleStatus) || "deleted",
    related: related || fromJson,
    restoreUrl: restoreUrlFor(row.moduleKey, row.entityId),
    purgeUrl: purgeUrlFor(row.moduleKey, row.entityId),
    detailHref: detailHrefFor(row.moduleKey, row.entityId),
  };
}
