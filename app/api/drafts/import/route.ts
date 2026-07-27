import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/prisma/db";
import { DRAFT_TTL_MS } from "@/lib/drafts/types";
import { tServer } from "@/lib/i18n";
import {
  defaultTitleForKey,
  estimateProgress,
  moduleFromDraftKey,
} from "@/lib/drafts/centerMeta";

const schema = z.object({
  drafts: z
    .array(
      z.object({
        key: z.string().min(1).max(120),
        data: z.unknown(),
        title: z.string().max(200).optional(),
        moduleKey: z.string().max(60).optional(),
        tags: z.array(z.string()).max(20).optional(),
      })
    )
    .min(1)
    .max(50),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: tServer.t("api.unauthorized") },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: tServer.t("api.invalidImport") },
        { status: 400 }
      );
    }

    const now = Date.now();
    let imported = 0;
    for (const d of parsed.data.drafts) {
      const key = d.key.includes(":import:")
        ? d.key
        : `${d.key}:import:${now.toString(36)}`;
      await db.formDraft.upsert({
        where: {
          userId_draftKey: { userId: user.id, draftKey: key },
        },
        create: {
          companyId: user.companyId,
          userId: user.id,
          draftKey: key,
          payload: d.data as object,
          savedAt: new Date(now),
          expiresAt: new Date(now + DRAFT_TTL_MS),
          title: d.title || defaultTitleForKey(d.key),
          status: "recovered",
          moduleKey: d.moduleKey || moduleFromDraftKey(d.key),
          progress: estimateProgress(d.data),
          tags: d.tags || ["imported"],
        },
        update: {
          payload: d.data as object,
          savedAt: new Date(now),
          status: "recovered",
          title: d.title || undefined,
          progress: estimateProgress(d.data),
        },
      });
      imported += 1;
    }

    await db.draftAuditEvent.create({
      data: {
        companyId: user.companyId,
        userId: user.id,
        draftKey: "import",
        action: "imported",
        detail: { count: imported },
      },
    });

    return NextResponse.json({ success: true, data: { imported } });
  } catch (error) {
    console.error("IMPORT DRAFTS ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
