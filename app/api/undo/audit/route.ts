import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { auditSafe } from "@/lib/audit/log";

const schema = z.object({
  action: z.enum(["UNDO", "REDO", "ACTION"]),
  module: z.string().min(1).max(60),
  kind: z.string().min(1).max(60),
  label: z.string().min(1).max(200),
  entityType: z.string().max(80).optional(),
  entityId: z.string().max(80).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Records Original / Undo / Redo actions in the permanent audit trail.
 * Scoped to the authenticated user only.
 */
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
        { success: false, message: "Invalid payload" },
        { status: 400 }
      );
    }

    const { action, module, kind, label, entityType, entityId, meta } =
      parsed.data;

    const summary =
      action === "UNDO"
        ? `Undo: ${label}`
        : action === "REDO"
          ? `Redo: ${label}`
          : label;

    await auditSafe({
      companyId: user.companyId,
      userId: user.id,
      module: String(module).toUpperCase(),
      action,
      entityType: entityType ?? kind,
      entityId: entityId ?? null,
      summary,
      metadata: {
        undoKind: kind,
        undoModule: module,
        ...meta,
      },
      req,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("UNDO AUDIT ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
