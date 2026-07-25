import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/prisma/db";

const historySchema = z.array(
  z.object({
    query: z.string().min(1).max(80),
    at: z.number(),
  })
);

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const prefs = await db.searchPrefs.findUnique({
      where: { userId: user.id },
    });
    const history = Array.isArray(prefs?.history) ? prefs!.history : [];
    return NextResponse.json({ success: true, data: { history } });
  } catch (error) {
    console.error("GET SEARCH HISTORY ERROR:", error);
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
    const parsed = historySchema.safeParse(body?.history ?? body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Invalid history" },
        { status: 400 }
      );
    }

    const history = parsed.data.slice(0, 30);

    await db.searchPrefs.upsert({
      where: { userId: user.id },
      create: {
        companyId: user.companyId,
        userId: user.id,
        history,
      },
      update: { history },
    });

    return NextResponse.json({ success: true, data: { history } });
  } catch (error) {
    console.error("PUT SEARCH HISTORY ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
