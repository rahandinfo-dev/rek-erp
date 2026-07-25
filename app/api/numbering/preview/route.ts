import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/prisma/db";
import { renderFormat } from "@/lib/numbering/format";
import { getNumberingRule } from "@/lib/numbering/engine";
import { DEFAULT_RULES, type NumberingModule } from "@/lib/numbering/types";

const schema = z.object({
  moduleKey: z.string(),
  format: z.string().optional(),
  prefix: z.string().optional(),
  suffix: z.string().optional(),
  moduleCode: z.string().optional(),
  padLength: z.number().int().min(1).max(12).optional(),
  startFrom: z.number().int().min(1).optional(),
  fiscalYearStartMonth: z.number().int().min(1).max(12).optional(),
  companyCode: z.string().optional(),
  warehouseCode: z.string().optional(),
  sequence: z.number().int().min(1).optional(),
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
        { success: false, message: "Invalid" },
        { status: 400 }
      );
    }

    const stored = await getNumberingRule(
      user.companyId,
      parsed.data.moduleKey
    );
    const defaults =
      DEFAULT_RULES[parsed.data.moduleKey as NumberingModule] || stored;

    const company = await db.company.findUnique({
      where: { id: user.companyId },
      select: { code: true, name: true },
    });

    const rule = {
      ...stored,
      format: parsed.data.format ?? stored.format ?? defaults.format,
      prefix: parsed.data.prefix ?? stored.prefix,
      suffix: parsed.data.suffix ?? stored.suffix,
      moduleCode: parsed.data.moduleCode ?? stored.moduleCode,
      padLength: parsed.data.padLength ?? stored.padLength,
      fiscalYearStartMonth:
        parsed.data.fiscalYearStartMonth ?? stored.fiscalYearStartMonth,
    };

    const seq = parsed.data.sequence ?? stored.startFrom ?? 1;
    const preview = renderFormat(rule, seq, {
      companyCode:
        parsed.data.companyCode ||
        company?.code ||
        company?.name?.slice(0, 4) ||
        "CO",
      warehouseCode: parsed.data.warehouseCode,
    });

    return NextResponse.json({
      success: true,
      data: { preview, sequence: seq },
    });
  } catch (error) {
    console.error("NUMBERING PREVIEW ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
