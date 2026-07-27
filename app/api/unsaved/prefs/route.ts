import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/prisma/db";
import { tServer } from "@/lib/i18n";
import {
  emptySaveGuardPrefs,
  type SaveGuardPrefs,
} from "@/lib/unsaved/types";

const prefsSchema = z.object({
  version: z.literal(1).optional(),
  autoSaveEnabled: z.boolean(),
  autoSaveDelayMs: z.union([
    z.literal(5000),
    z.literal(10000),
    z.literal(30000),
    z.literal(60000),
  ]),
  updatedAt: z.number().optional(),
});

function parsePrefs(
  raw: unknown,
  userId: string,
  companyId: string
): SaveGuardPrefs {
  const base = emptySaveGuardPrefs(userId, companyId);
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Partial<SaveGuardPrefs>;
  return {
    ...base,
    autoSaveEnabled: o.autoSaveEnabled !== false,
    autoSaveDelayMs: ([5000, 10000, 30000, 60000] as const).includes(
      o.autoSaveDelayMs as 5000
    )
      ? (o.autoSaveDelayMs as SaveGuardPrefs["autoSaveDelayMs"])
      : 5000,
    updatedAt: Number(o.updatedAt || Date.now()),
  };
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: tServer.t("api.unauthorized") },
        { status: 401 }
      );
    }

    const row = await db.saveGuardPrefs.findUnique({
      where: { userId: user.id },
    });

    const data = row
      ? parsePrefs(row.prefs, user.id, user.companyId)
      : emptySaveGuardPrefs(user.id, user.companyId);

    if (!row) {
      await db.saveGuardPrefs.create({
        data: {
          companyId: user.companyId,
          userId: user.id,
          prefs: data as object,
        },
      });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("GET SAVE GUARD PREFS ERROR:", error);
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

    const data: SaveGuardPrefs = {
      version: 1,
      userId: user.id,
      companyId: user.companyId,
      autoSaveEnabled: parsed.data.autoSaveEnabled,
      autoSaveDelayMs: parsed.data.autoSaveDelayMs,
      updatedAt: Date.now(),
    };

    await db.saveGuardPrefs.upsert({
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
    console.error("PUT SAVE GUARD PREFS ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
