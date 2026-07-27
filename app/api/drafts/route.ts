import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/prisma/db";
import { DRAFT_TTL_MS } from "@/lib/drafts/types";
import { tServer } from "@/lib/i18n";
import {
  ARCHIVE_AFTER_MS,
  defaultTitleForKey,
  estimateProgress,
  moduleFromDraftKey,
  moduleLabel,
  modifiedFieldLabels,
  resumeHrefForKey,
  type DraftListItem,
} from "@/lib/drafts/centerMeta";

const putSchema = z.object({
  key: z.string().min(1).max(120),
  data: z.unknown(),
  savedAt: z.number().optional(),
  expiresAt: z.number().optional(),
  baseSavedAt: z.number().optional(),
  meta: z
    .object({
      title: z.string().max(200).optional(),
      status: z.string().max(40).optional(),
      pinned: z.boolean().optional(),
      archived: z.boolean().optional(),
      moduleKey: z.string().max(60).optional(),
      device: z.string().max(80).optional(),
      progress: z.number().int().min(0).max(100).optional(),
      tags: z.array(z.string().max(40)).max(20).optional(),
      shareToken: z.string().max(80).nullable().optional(),
      createdAt: z.number().optional(),
    })
    .optional(),
  /** Snapshot a version on save */
  snapshotVersion: z.boolean().optional(),
});

const patchSchema = z.object({
  key: z.string().min(1).max(120),
  action: z.enum([
    "rename",
    "pin",
    "unpin",
    "archive",
    "restore",
    "complete",
    "duplicate",
    "share",
    "set-status",
    "set-tags",
  ]),
  title: z.string().max(200).optional(),
  status: z.string().max(40).optional(),
  tags: z.array(z.string().max(40)).max(20).optional(),
});

function rowToListItem(row: {
  draftKey: string;
  title: string | null;
  status: string;
  pinned: boolean;
  archived: boolean;
  moduleKey: string | null;
  device: string | null;
  progress: number;
  tags: unknown;
  shareToken: string | null;
  createdAt: Date;
  savedAt: Date;
  updatedAt: Date;
  payload: unknown;
}): DraftListItem {
  const moduleKey = row.moduleKey || moduleFromDraftKey(row.draftKey);
  return {
    key: row.draftKey,
    title: row.title || defaultTitleForKey(row.draftKey),
    moduleKey,
    moduleLabel: moduleLabel(moduleKey),
    status: (row.archived ? "archived" : row.status) as DraftListItem["status"],
    pinned: row.pinned,
    archived: row.archived,
    progress: row.progress || estimateProgress(row.payload),
    device: row.device,
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    createdAt: row.createdAt.getTime(),
    savedAt: row.savedAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
    resumeHref: resumeHrefForKey(row.draftKey),
    shareToken: row.shareToken,
    modifiedFields: modifiedFieldLabels(row.payload),
    source: "form",
  };
}

async function autoArchiveOld(userId: string) {
  const cutoff = new Date(Date.now() - ARCHIVE_AFTER_MS);
  await db.formDraft.updateMany({
    where: {
      userId,
      archived: false,
      savedAt: { lt: cutoff },
      status: { not: "completed" },
    },
    data: {
      archived: true,
      status: "archived",
      archivedAt: new Date(),
    },
  });
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: tServer.t("api.unauthorized") },
        { status: 401 }
      );
    }

    const key = req.nextUrl.searchParams.get("key");
    const includeArchived =
      req.nextUrl.searchParams.get("archived") === "1";

    await db.formDraft.deleteMany({
      where: {
        userId: user.id,
        expiresAt: { lt: new Date() },
      },
    });
    await autoArchiveOld(user.id);

    if (!key) {
      const rows = await db.formDraft.findMany({
        where: {
          userId: user.id,
          ...(includeArchived ? {} : { archived: false }),
        },
        orderBy: [{ pinned: "desc" }, { savedAt: "desc" }],
        take: 200,
      });
      return NextResponse.json({
        success: true,
        data: rows.map(rowToListItem),
      });
    }

    const row = await db.formDraft.findUnique({
      where: {
        userId_draftKey: { userId: user.id, draftKey: key },
      },
    });

    if (!row || row.expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ success: true, data: null });
    }

    return NextResponse.json({
      success: true,
      data: {
        version: 2 as const,
        key: row.draftKey,
        userId: row.userId,
        companyId: row.companyId,
        savedAt: row.savedAt.getTime(),
        expiresAt: row.expiresAt.getTime(),
        data: row.payload,
        meta: {
          title: row.title,
          status: row.status,
          pinned: row.pinned,
          archived: row.archived,
          moduleKey: row.moduleKey,
          device: row.device,
          progress: row.progress,
          tags: row.tags,
          shareToken: row.shareToken,
          createdAt: row.createdAt.getTime(),
        },
      },
    });
  } catch (error) {
    console.error("GET DRAFT ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: tServer.t("api.unauthorized") },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = putSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: tServer.t("api.invalidDraft") },
        { status: 400 }
      );
    }

    const now = Date.now();
    const savedAt = new Date(parsed.data.savedAt || now);
    const expiresAt = new Date(
      parsed.data.expiresAt || now + DRAFT_TTL_MS
    );
    const meta = parsed.data.meta || {};
    const moduleKey = meta.moduleKey || moduleFromDraftKey(parsed.data.key);
    const progress =
      meta.progress ?? estimateProgress(parsed.data.data);

    const existing = await db.formDraft.findUnique({
      where: {
        userId_draftKey: {
          userId: user.id,
          draftKey: parsed.data.key,
        },
      },
    });

    if (
      existing &&
      typeof parsed.data.baseSavedAt === "number" &&
      existing.savedAt.getTime() > parsed.data.baseSavedAt + 500
    ) {
      const same =
        JSON.stringify(existing.payload) ===
        JSON.stringify(parsed.data.data);
      if (!same) {
        return NextResponse.json(
          {
            success: false,
            conflict: true,
            message: tServer.t("api.draftConflict"),
            data: {
              theirs: {
                version: 2 as const,
                key: existing.draftKey,
                userId: existing.userId,
                companyId: existing.companyId,
                savedAt: existing.savedAt.getTime(),
                expiresAt: existing.expiresAt.getTime(),
                data: existing.payload,
                meta: {
                  title: existing.title,
                  status: existing.status,
                  progress: existing.progress,
                  device: existing.device,
                },
              },
            },
          },
          { status: 409 }
        );
      }
    }

    const row = await db.formDraft.upsert({
      where: {
        userId_draftKey: {
          userId: user.id,
          draftKey: parsed.data.key,
        },
      },
      create: {
        companyId: user.companyId,
        userId: user.id,
        draftKey: parsed.data.key,
        payload: parsed.data.data as object,
        savedAt,
        expiresAt,
        title: meta.title || defaultTitleForKey(parsed.data.key),
        status: meta.status || "saved",
        pinned: meta.pinned ?? false,
        archived: meta.archived ?? false,
        moduleKey,
        device: meta.device || null,
        progress,
        tags: meta.tags || [],
        shareToken: meta.shareToken ?? null,
      },
      update: {
        payload: parsed.data.data as object,
        savedAt,
        expiresAt,
        title: meta.title || undefined,
        status: meta.status || "saved",
        moduleKey,
        device: meta.device || undefined,
        progress,
        ...(meta.tags ? { tags: meta.tags } : {}),
        ...(typeof meta.pinned === "boolean" ? { pinned: meta.pinned } : {}),
        ...(typeof meta.archived === "boolean"
          ? { archived: meta.archived }
          : {}),
      },
    });

    // Version snapshot (throttle: every save when requested, else every ~5 min)
    const shouldSnap =
      parsed.data.snapshotVersion ||
      !existing ||
      savedAt.getTime() - existing.savedAt.getTime() > 5 * 60 * 1000;
    if (shouldSnap) {
      const last = await db.draftVersion.findFirst({
        where: { userId: user.id, draftKey: parsed.data.key },
        orderBy: { version: "desc" },
      });
      const nextVer = (last?.version || 0) + 1;
      await db.draftVersion.create({
        data: {
          companyId: user.companyId,
          userId: user.id,
          draftKey: parsed.data.key,
          version: nextVer,
          payload: parsed.data.data as object,
          device: meta.device || null,
          progress,
          label: `v${nextVer}`,
        },
      });
      // Keep last 30 versions
      const old = await db.draftVersion.findMany({
        where: { userId: user.id, draftKey: parsed.data.key },
        orderBy: { version: "desc" },
        skip: 30,
        select: { id: true },
      });
      if (old.length) {
        await db.draftVersion.deleteMany({
          where: { id: { in: old.map((o) => o.id) } },
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        key: row.draftKey,
        savedAt: row.savedAt.getTime(),
        expiresAt: row.expiresAt.getTime(),
        progress: row.progress,
      },
    });
  } catch (error) {
    console.error("PUT DRAFT ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: tServer.t("api.unauthorized") },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: tServer.t("api.invalidPatch") },
        { status: 400 }
      );
    }

    const existing = await db.formDraft.findUnique({
      where: {
        userId_draftKey: {
          userId: user.id,
          draftKey: parsed.data.key,
        },
      },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: tServer.t("api.draftNotFound") },
        { status: 404 }
      );
    }

    let data: Record<string, unknown> = {};
    let duplicateKey: string | null = null;

    switch (parsed.data.action) {
      case "rename":
        data = { title: parsed.data.title || existing.title };
        break;
      case "pin":
        data = { pinned: true };
        break;
      case "unpin":
        data = { pinned: false };
        break;
      case "archive":
        data = {
          archived: true,
          status: "archived",
          archivedAt: new Date(),
        };
        break;
      case "restore":
        data = {
          archived: false,
          status: "recovered",
          archivedAt: null,
        };
        break;
      case "complete":
        data = {
          status: "completed",
          completedAt: new Date(),
          progress: 100,
        };
        break;
      case "set-status":
        data = { status: parsed.data.status || existing.status };
        break;
      case "set-tags":
        data = { tags: parsed.data.tags || [] };
        break;
      case "share": {
        const token =
          existing.shareToken ||
          `d_${user.id.slice(0, 6)}_${Math.random().toString(36).slice(2, 10)}`;
        data = { shareToken: token };
        break;
      }
      case "duplicate": {
        duplicateKey = `${existing.draftKey}:copy:${Date.now().toString(36)}`;
        await db.formDraft.create({
          data: {
            companyId: user.companyId,
            userId: user.id,
            draftKey: duplicateKey,
            payload: existing.payload as object,
            savedAt: new Date(),
            expiresAt: new Date(Date.now() + DRAFT_TTL_MS),
            title: `${existing.title || defaultTitleForKey(existing.draftKey)} (Copy)`,
            status: "draft",
            pinned: false,
            archived: false,
            moduleKey: existing.moduleKey,
            device: existing.device,
            progress: existing.progress,
            tags: existing.tags as object,
          },
        });
        break;
      }
    }

    const row =
      parsed.data.action === "duplicate"
        ? existing
        : await db.formDraft.update({
            where: { id: existing.id },
            data,
          });

    await db.draftAuditEvent.create({
      data: {
        companyId: user.companyId,
        userId: user.id,
        draftKey: parsed.data.key,
        action: parsed.data.action,
        detail: {
          title: parsed.data.title,
          duplicateKey,
        },
        ip:
          req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          null,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...rowToListItem(row),
        duplicateKey,
        shareUrl: row.shareToken
          ? `/dashboard/drafts?share=${row.shareToken}`
          : null,
      },
    });
  } catch (error) {
    console.error("PATCH DRAFT ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: tServer.t("api.unauthorized") },
        { status: 401 }
      );
    }

    const key = req.nextUrl.searchParams.get("key");
    if (!key) {
      return NextResponse.json(
        { success: false, message: tServer.t("api.keyRequired") },
        { status: 400 }
      );
    }

    await db.formDraft.deleteMany({
      where: { userId: user.id, draftKey: key },
    });
    await db.draftAuditEvent.create({
      data: {
        companyId: user.companyId,
        userId: user.id,
        draftKey: key,
        action: "deleted",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE DRAFT ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
