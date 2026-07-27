import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/prisma/db";
import { tServer } from "@/lib/i18n";
import {
  emptyQuickActionPrefs,
  parseQuickActionPrefs,
} from "@/lib/quick-actions/prefs";
import { QUICK_ACTION_IDS } from "@/lib/quick-actions/types";
import type { QuickActionPrefs } from "@/lib/quick-actions/types";

const idSchema = z.enum(
  QUICK_ACTION_IDS as unknown as [string, ...string[]]
);

const prefsSchema = z.object({
  version: z.literal(1).optional(),
  pinnedIds: z.array(idSchema).max(20),
  hiddenIds: z.array(idSchema).max(40),
  orderByModule: z.record(z.string(), z.array(idSchema).max(40)).optional(),
  updatedAt: z.number().optional(),
});

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: tServer.t("api.unauthorized") },
        { status: 401 }
      );
    }

    const row = await db.quickActionPrefs.findUnique({
      where: { userId: user.id },
    });

    const data = row
      ? parseQuickActionPrefs(row.prefs, user.id, user.companyId)
      : emptyQuickActionPrefs(user.id, user.companyId);

    if (!row) {
      await db.quickActionPrefs.create({
        data: {
          companyId: user.companyId,
          userId: user.id,
          prefs: data as object,
        },
      });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("GET QUICK ACTION PREFS ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: tServer.t("api.unauthorized") },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = prefsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: tServer.t("api.invalidPrefs") },
        { status: 400 }
      );
    }

    const data: QuickActionPrefs = {
      version: 1,
      userId: user.id,
      companyId: user.companyId,
      pinnedIds: parsed.data.pinnedIds as QuickActionPrefs["pinnedIds"],
      hiddenIds: parsed.data.hiddenIds as QuickActionPrefs["hiddenIds"],
      orderByModule: (parsed.data.orderByModule ||
        {}) as QuickActionPrefs["orderByModule"],
      updatedAt: Date.now(),
    };

    await db.quickActionPrefs.upsert({
      where: { userId: user.id },
      create: {
        companyId: user.companyId,
        userId: user.id,
        prefs: data as object,
      },
      update: { prefs: data as object },
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("PUT QUICK ACTION PREFS ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
