import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/prisma/db";
import {
  listAutomations,
  runDueAutomations,
  suggestedNextActions,
} from "@/lib/ai/automation";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const run = req.nextUrl.searchParams.get("run") === "1";
    const rules = await listAutomations(user.companyId);
    const nextActions = await suggestedNextActions(user.companyId);
    const ran = run ? await runDueAutomations(user.companyId) : [];

    return NextResponse.json({
      success: true,
      data: { rules, nextActions, ran },
    });
  } catch (error) {
    console.error("AI AUTOMATIONS GET ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}

const patchSchema = z.object({
  id: z.string().min(1),
  enabled: z.boolean(),
});

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Invalid" },
        { status: 400 }
      );
    }

    const row = await db.aiAutomationRule.findFirst({
      where: { id: parsed.data.id, companyId: user.companyId },
    });
    if (!row) {
      return NextResponse.json(
        { success: false, message: "نەدۆزرایەوە" },
        { status: 404 }
      );
    }

    const updated = await db.aiAutomationRule.update({
      where: { id: row.id },
      data: { enabled: parsed.data.enabled },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("AI AUTOMATIONS PATCH ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
