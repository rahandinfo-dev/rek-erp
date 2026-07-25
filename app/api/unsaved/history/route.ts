import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/prisma/db";
import type { SaveHistoryEntry } from "@/lib/unsaved/types";

const schema = z.object({
  entries: z
    .array(
      z.object({
        id: z.string(),
        sourceId: z.string(),
        label: z.string(),
        savedAt: z.number(),
        durationMs: z.number(),
        device: z.string(),
        ok: z.boolean(),
      })
    )
    .max(40),
});

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const row = await db.saveGuardPrefs.findUnique({
      where: { userId: user.id },
    });
    const prefs = (row?.prefs || {}) as { history?: SaveHistoryEntry[] };
    return NextResponse.json({
      success: true,
      data: Array.isArray(prefs.history) ? prefs.history : [],
    });
  } catch (error) {
    console.error("GET SAVE HISTORY ERROR:", error);
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
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Invalid history" },
        { status: 400 }
      );
    }

    const existing = await db.saveGuardPrefs.findUnique({
      where: { userId: user.id },
    });
    const prev = (existing?.prefs || {}) as Record<string, unknown>;
    const nextPrefs = {
      ...prev,
      history: parsed.data.entries.slice(0, 40),
      updatedAt: Date.now(),
    };

    await db.saveGuardPrefs.upsert({
      where: { userId: user.id },
      create: {
        companyId: user.companyId,
        userId: user.id,
        prefs: nextPrefs,
      },
      update: { prefs: nextPrefs },
    });

    return NextResponse.json({
      success: true,
      data: parsed.data.entries,
    });
  } catch (error) {
    console.error("PUT SAVE HISTORY ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
