import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/prisma/db";
import { tServer } from "@/lib/i18n";
import {
  DEFAULT_BINDINGS,
  emptyKeyboardPrefs,
  type KeyboardPrefs,
} from "@/lib/command/keyboardPrefs";

const prefsSchema = z.object({
  version: z.literal(1).optional(),
  bindings: z.record(
    z.string(),
    z.object({
      keys: z.string().min(1).max(60),
      disabled: z.boolean().optional(),
    })
  ),
  favoriteCommandIds: z.array(z.string().max(80)).max(100),
  commandHistory: z
    .array(
      z.object({
        id: z.string().max(80),
        at: z.number(),
      })
    )
    .max(30),
  updatedAt: z.number().optional(),
});

function parsePrefs(
  raw: unknown,
  userId: string,
  companyId: string
): KeyboardPrefs {
  const base = emptyKeyboardPrefs(userId, companyId);
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Partial<KeyboardPrefs>;
  return {
    version: 1,
    userId,
    companyId,
    bindings: { ...DEFAULT_BINDINGS, ...(o.bindings || {}) },
    favoriteCommandIds: Array.isArray(o.favoriteCommandIds)
      ? o.favoriteCommandIds.slice(0, 100)
      : [],
    commandHistory: Array.isArray(o.commandHistory)
      ? o.commandHistory.slice(0, 30)
      : [],
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

    const row = await db.keyboardPrefs.findUnique({
      where: { userId: user.id },
    });

    const data = row
      ? parsePrefs(row.prefs, user.id, user.companyId)
      : emptyKeyboardPrefs(user.id, user.companyId);

    if (!row) {
      await db.keyboardPrefs.create({
        data: {
          companyId: user.companyId,
          userId: user.id,
          prefs: data as object,
        },
      });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("GET KEYBOARD PREFS ERROR:", error);
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

    const data: KeyboardPrefs = {
      version: 1,
      userId: user.id,
      companyId: user.companyId,
      bindings: { ...DEFAULT_BINDINGS, ...parsed.data.bindings },
      favoriteCommandIds: parsed.data.favoriteCommandIds.slice(0, 100),
      commandHistory: parsed.data.commandHistory.slice(0, 30),
      updatedAt: Date.now(),
    };

    await db.keyboardPrefs.upsert({
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
    console.error("PUT KEYBOARD PREFS ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
