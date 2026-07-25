import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/prisma/db";
import { auditSafe } from "@/lib/audit/log";

const schema = z.object({
  sourceId: z.string().min(1).max(160),
  label: z.string().min(1).max(200),
  action: z.enum([
    "save",
    "discard",
    "conflict-mine",
    "conflict-theirs",
    "conflict-merge",
    "retry-failed",
  ]),
  summary: z.array(z.string().max(120)).max(20).optional(),
  status: z.enum(["ok", "error", "offline"]),
  device: z.string().max(80).optional(),
  durationMs: z.number().int().nonnegative().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Invalid audit" },
        { status: 400 }
      );
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      null;

    const row = await db.saveAuditEvent.create({
      data: {
        companyId: user.companyId,
        userId: user.id,
        sourceId: parsed.data.sourceId,
        label: parsed.data.label,
        action: parsed.data.action,
        status: parsed.data.status,
        device: parsed.data.device || null,
        ip,
        summary: parsed.data.summary || [],
        durationMs: parsed.data.durationMs ?? null,
      },
    });

    void auditSafe({
      companyId: user.companyId,
      userId: user.id,
      module: "SYSTEM",
      action:
        parsed.data.action === "retry-failed"
          ? "OTHER"
          : parsed.data.action.startsWith("conflict")
            ? "UPDATE"
            : "AUTOSAVE",
      entityType: "SaveGuard",
      entityId: parsed.data.sourceId,
      summary: `${parsed.data.label}: ${parsed.data.action}`,
      newValue: { summary: parsed.data.summary, durationMs: parsed.data.durationMs },
      status: parsed.data.status === "error" ? "failed" : "success",
      device: parsed.data.device,
      ipAddress: ip,
      req,
    });

    return NextResponse.json({ success: true, data: { id: row.id } });
  } catch (error) {
    console.error("POST SAVE AUDIT ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
