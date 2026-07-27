import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { auditSafe } from "@/lib/audit/log";
import { tServer } from "@/lib/i18n";

const schema = z.object({
  action: z.enum([
    "RECOVERY_CREATED",
    "RECOVERY_RESTORED",
    "RECOVERY_DELETED",
    "RECOVERY_EXPIRED",
  ]),
  moduleKey: z.string().min(1).max(80),
  summary: z.string().max(300).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
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

    const { action, moduleKey, summary, meta } = parsed.data;

    await auditSafe({
      companyId: user.companyId,
      userId: user.id,
      module: "SYSTEM",
      action,
      entityType: "SessionRecovery",
      entityId: moduleKey,
      summary: summary || `${action} · ${moduleKey}`,
      metadata: { moduleKey, ...meta },
      req,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("RECOVERY AUDIT ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
