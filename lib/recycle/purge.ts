import { db } from "@/lib/prisma/db";
import {
  purgeBlockedByRelated,
  relatedForEntity,
} from "@/lib/recycle/related";
import { purgeUrlFor } from "@/lib/recycle/map";
import { recordRecyclePurged } from "@/lib/recycle/record";

/**
 * Attempt automatic permanent purge for expired recycle-bin rows.
 * Respects business rules — skips when related history blocks purge.
 */
export async function autoPurgeExpired(
  companyId: string,
  opts?: {
    cookie?: string;
    origin?: string;
    limit?: number;
  }
): Promise<{ attempted: number; purged: number; skipped: number }> {
  const limit = opts?.limit ?? 25;
  const now = new Date();
  let purged = 0;
  let skipped = 0;

  const expired = await db.recycleBinEntry.findMany({
    where: {
      companyId,
      status: "deleted",
      expiresAt: { lte: now },
    },
    orderBy: { expiresAt: "asc" },
    take: limit,
  });

  for (const row of expired) {
    const related = await relatedForEntity(
      companyId,
      row.moduleKey,
      row.entityId
    );
    if (purgeBlockedByRelated(row.moduleKey, related)) {
      skipped += 1;
      continue;
    }

    const url = purgeUrlFor(row.moduleKey, row.entityId);
    if (!url || !opts?.origin || !opts?.cookie) {
      // Mark purged in ledger only when no hard-delete endpoint (cleanup UI)
      // but keep entity soft-deleted — do not invent hard delete.
      skipped += 1;
      continue;
    }

    try {
      const res = await fetch(new URL(url, opts.origin).toString(), {
        method: "DELETE",
        headers: {
          cookie: opts.cookie,
          "content-type": "application/json",
        },
      });
      if (res.ok) {
        await recordRecyclePurged({
          companyId,
          entityType: row.entityType,
          entityId: row.entityId,
        });
        purged += 1;
      } else {
        skipped += 1;
      }
    } catch {
      skipped += 1;
    }
  }

  return { attempted: expired.length, purged, skipped };
}
