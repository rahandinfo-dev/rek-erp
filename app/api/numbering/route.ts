import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/prisma/db";
import {
  ensureDefaultRules,
  listNumberingRules,
  resetCounter,
} from "@/lib/numbering/engine";
import { NUMBERING_MODULES } from "@/lib/numbering/types";
import { auditSafe } from "@/lib/audit/log";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const company = await db.company.findUnique({
      where: { id: user.companyId },
      select: { code: true, name: true },
    });

    const rules = await listNumberingRules(user.companyId);

    return NextResponse.json({
      success: true,
      data: {
        companyCode:
          company?.code ||
          company?.name?.replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase() ||
          "CO",
        rules,
        modules: NUMBERING_MODULES,
      },
    });
  } catch (error) {
    console.error("NUMBERING LIST ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}

const upsertSchema = z.object({
  companyCode: z.string().max(16).optional(),
  rules: z.array(
    z.object({
      moduleKey: z.string().min(1),
      enabled: z.boolean(),
      format: z.string().min(1).max(80),
      prefix: z.string().max(16).optional(),
      suffix: z.string().max(16).optional(),
      moduleCode: z.string().max(16).optional(),
      padLength: z.number().int().min(1).max(12),
      startFrom: z.number().int().min(1).max(1_000_000_000),
      resetPolicy: z.enum(["none", "yearly", "monthly"]),
      fiscalYearStartMonth: z.number().int().min(1).max(12),
      allowManualOverride: z.boolean(),
      resetNow: z.boolean().optional(),
    })
  ),
});

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = upsertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Invalid numbering settings" },
        { status: 400 }
      );
    }

    await ensureDefaultRules(user.companyId);

    if (parsed.data.companyCode !== undefined) {
      await db.company.update({
        where: { id: user.companyId },
        data: {
          code: parsed.data.companyCode
            .trim()
            .toUpperCase()
            .replace(/[^A-Z0-9_-]/g, "")
            .slice(0, 16) || null,
        },
      });
    }

    for (const rule of parsed.data.rules) {
      await db.numberingRule.upsert({
        where: {
          companyId_moduleKey: {
            companyId: user.companyId,
            moduleKey: rule.moduleKey,
          },
        },
        create: {
          companyId: user.companyId,
          moduleKey: rule.moduleKey,
          enabled: rule.enabled,
          format: rule.format,
          prefix: rule.prefix || "",
          suffix: rule.suffix || "",
          moduleCode: rule.moduleCode || "",
          padLength: rule.padLength,
          startFrom: rule.startFrom,
          resetPolicy: rule.resetPolicy,
          fiscalYearStartMonth: rule.fiscalYearStartMonth,
          allowManualOverride: rule.allowManualOverride,
        },
        update: {
          enabled: rule.enabled,
          format: rule.format,
          prefix: rule.prefix || "",
          suffix: rule.suffix || "",
          moduleCode: rule.moduleCode || "",
          padLength: rule.padLength,
          startFrom: rule.startFrom,
          resetPolicy: rule.resetPolicy,
          fiscalYearStartMonth: rule.fiscalYearStartMonth,
          allowManualOverride: rule.allowManualOverride,
        },
      });

      if (rule.resetNow) {
        await resetCounter(user.companyId, rule.moduleKey, rule.startFrom);
      }
    }

    await auditSafe({
      companyId: user.companyId,
      userId: user.id,
      module: "SETTINGS",
      action: "UPDATE",
      entityType: "NumberingRule",
      summary: `Numbering settings updated (${parsed.data.rules.length} modules)`,
      newValue: { count: parsed.data.rules.length },
      req,
    });

    const rules = await listNumberingRules(user.companyId);
    return NextResponse.json({ success: true, data: { rules } });
  } catch (error) {
    console.error("NUMBERING SAVE ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
