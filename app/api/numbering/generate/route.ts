import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { generateDocumentNumber } from "@/lib/numbering/engine";
import { NUMBERING_MODULES } from "@/lib/numbering/types";
import { auditSafe } from "@/lib/audit/log";
import { tServer } from "@/lib/i18n";

const schema = z.object({
  moduleKey: z.enum(NUMBERING_MODULES),
  override: z.string().optional(),
  warehouseCode: z.string().optional(),
  previewOnly: z.boolean().optional(),
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

    const result = await generateDocumentNumber(parsed.data.moduleKey, {
      companyId: user.companyId,
      warehouseCode: parsed.data.warehouseCode,
      override: parsed.data.override,
      previewOnly: parsed.data.previewOnly,
    });

    if (!parsed.data.previewOnly) {
      await auditSafe({
        companyId: user.companyId,
        userId: user.id,
        module: "SETTINGS",
        action: "CREATE",
        entityType: "DocumentNumber",
        summary: `Generated ${parsed.data.moduleKey} number ${result.value}`,
        newValue: result,
        req,
      });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("NUMBERING GENERATE ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "هەڵەیەک ڕوویدا.",
      },
      { status: 400 }
    );
  }
}
