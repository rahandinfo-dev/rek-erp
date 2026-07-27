import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/prisma/db";
import { auditSafe } from "@/lib/audit/log";
import { tServer } from "@/lib/i18n";

const schema = z.object({
  draftKey: z.string().min(1).max(120),
  action: z.string().min(1).max(60),
  detail: z.unknown().optional(),
  device: z.string().max(80).optional(),
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
        { success: false, message: tServer.t("api.invalid") },
        { status: 400 }
      );
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      null;

    const row = await db.draftAuditEvent.create({
      data: {
        companyId: user.companyId,
        userId: user.id,
        draftKey: parsed.data.draftKey,
        action: parsed.data.action,
        detail: (parsed.data.detail as object) || undefined,
        device: parsed.data.device || null,
        ip,
      },
    });

    // Mirror into enterprise Activity Timeline (non-blocking)
    void auditSafe({
      companyId: user.companyId,
      userId: user.id,
      module: "DRAFT",
      action:
        parsed.data.action === "imported"
          ? "IMPORT"
          : parsed.data.action.includes("recover")
            ? "DRAFT_RECOVERY"
            : parsed.data.action.includes("version")
              ? "RESTORE"
              : "AUTOSAVE",
      entityType: "FormDraft",
      entityId: parsed.data.draftKey,
      summary: `Draft ${parsed.data.action}: ${parsed.data.draftKey}`,
      newValue: parsed.data.detail,
      device: parsed.data.device,
      ipAddress: ip,
      req,
    });

    return NextResponse.json({ success: true, data: { id: row.id } });
  } catch (error) {
    console.error("POST DRAFT AUDIT ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
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
    const rows = await db.draftAuditEvent.findMany({
      where: {
        userId: user.id,
        ...(key ? { draftKey: key } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      data: rows.map((r) => ({
        id: r.id,
        draftKey: r.draftKey,
        action: r.action,
        detail: r.detail,
        device: r.device,
        createdAt: r.createdAt.getTime(),
      })),
    });
  } catch (error) {
    console.error("GET DRAFT AUDIT ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
