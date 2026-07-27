import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/prisma/db";
import { DRAFT_TTL_MS } from "@/lib/drafts/types";
import { tServer } from "@/lib/i18n";

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
    if (!key) {
      return NextResponse.json(
        { success: false, message: tServer.t("api.keyRequired") },
        { status: 400 }
      );
    }

    const rows = await db.draftVersion.findMany({
      where: { userId: user.id, draftKey: key },
      orderBy: { version: "desc" },
      take: 30,
      select: {
        id: true,
        version: true,
        label: true,
        device: true,
        progress: true,
        createdAt: true,
        payload: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: rows.map((r) => ({
        id: r.id,
        version: r.version,
        label: r.label || `v${r.version}`,
        device: r.device,
        progress: r.progress,
        createdAt: r.createdAt.getTime(),
        payload: r.payload,
      })),
    });
  } catch (error) {
    console.error("GET DRAFT VERSIONS ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}

const restoreSchema = z.object({
  key: z.string().min(1),
  versionId: z.string().min(1),
});

const deleteSchema = z.object({
  versionId: z.string().min(1),
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
    const action = req.nextUrl.searchParams.get("action") || "restore";

    if (action === "delete") {
      const parsed = deleteSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, message: tServer.t("api.invalid") },
          { status: 400 }
        );
      }
      await db.draftVersion.deleteMany({
        where: { id: parsed.data.versionId, userId: user.id },
      });
      return NextResponse.json({ success: true });
    }

    const parsed = restoreSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: tServer.t("api.invalid") },
        { status: 400 }
      );
    }

    const ver = await db.draftVersion.findFirst({
      where: {
        id: parsed.data.versionId,
        userId: user.id,
        draftKey: parsed.data.key,
      },
    });
    if (!ver) {
      return NextResponse.json(
        { success: false, message: tServer.t("api.versionNotFound") },
        { status: 404 }
      );
    }

    const now = Date.now();
    await db.formDraft.upsert({
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
        payload: ver.payload as object,
        savedAt: new Date(now),
        expiresAt: new Date(now + DRAFT_TTL_MS),
        status: "recovered",
        progress: ver.progress,
        device: ver.device,
      },
      update: {
        payload: ver.payload as object,
        savedAt: new Date(now),
        status: "recovered",
        progress: ver.progress,
      },
    });

    await db.draftAuditEvent.create({
      data: {
        companyId: user.companyId,
        userId: user.id,
        draftKey: parsed.data.key,
        action: "version-restored",
        detail: { versionId: ver.id, version: ver.version },
      },
    });

    return NextResponse.json({
      success: true,
      data: { payload: ver.payload, version: ver.version },
    });
  } catch (error) {
    console.error("POST DRAFT VERSIONS ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
