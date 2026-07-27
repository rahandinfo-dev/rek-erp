import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/prisma/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { apiFail, apiOk } from "@/lib/api/response";
import {
  CURRENCY_CATALOG,
  CURRENCY_CODES,
  resolveCurrencyCode,
} from "@/lib/currency/catalog";
import { notifySafe } from "@/lib/notifications/create";
import { auditSafe } from "@/lib/audit/log";

const schema = z.object({
  currency: z.enum(CURRENCY_CODES),
});

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return apiFail("تکایە سەرەتا بچۆ ژوورەوە.", 401);

    const settings = await db.settings.findUnique({
      where: { companyId: user.companyId },
      select: { currency: true },
    });

    const code = resolveCurrencyCode(settings?.currency);
    return apiOk({
      currency: code,
      meta: CURRENCY_CATALOG[code],
      options: CURRENCY_CODES.map((c) => CURRENCY_CATALOG[c]),
    });
  } catch (error) {
    console.error("[currency GET]", error);
    return apiFail("هەڵەیەک ڕوویدا.", 500);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return apiFail("تکایە سەرەتا بچۆ ژوورەوە.", 401);

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiFail("دراوی هەڵبژێردراو پشتگیری ناکرێت.", 400);
    }

    const currency = parsed.data.currency;
    const before = await db.settings.findUnique({
      where: { companyId: user.companyId },
      select: { currency: true },
    });

    await db.settings.upsert({
      where: { companyId: user.companyId },
      create: {
        companyId: user.companyId,
        currency,
      },
      update: { currency },
    });

    const meta = CURRENCY_CATALOG[currency];

    await notifySafe({
      companyId: user.companyId,
      userId: user.id,
      title: "دراوی کۆمپانیا گۆڕدرا",
      message: `دراوی سەرەکی بوو بە ${meta.nameKu} (${meta.symbol}).`,
      category: "SYSTEM",
      priority: "NORMAL",
      href: "/dashboard/currency",
      metadata: { kind: "CURRENCY_CHANGE", currency },
    });

    await auditSafe({
      companyId: user.companyId,
      userId: user.id,
      module: "SYSTEM",
      action: "UPDATE",
      entityType: "Settings",
      entityId: user.companyId,
      summary: `دراو: ${before?.currency || "IQD"} → ${currency}`,
      oldValue: { currency: before?.currency },
      newValue: { currency },
      req,
    });

    return apiOk(
      { currency, meta },
      { message: `دراو گۆڕدرا بۆ ${meta.nameKu}.` }
    );
  } catch (error) {
    console.error("[currency PUT]", error);
    return apiFail("هەڵەیەک ڕوویدا.", 500);
  }
}
