import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/prisma/db";
import { tServer } from "@/lib/i18n";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: tServer.t("api.unauthorized") },
        { status: 401 }
      );
    }

    const [total, recovered, completed, archived, failed, pinned] =
      await Promise.all([
        db.formDraft.count({ where: { userId: user.id } }),
        db.formDraft.count({
          where: { userId: user.id, status: "recovered" },
        }),
        db.formDraft.count({
          where: { userId: user.id, status: "completed" },
        }),
        db.formDraft.count({
          where: { userId: user.id, archived: true },
        }),
        db.formDraft.count({
          where: { userId: user.id, status: "failed" },
        }),
        db.formDraft.count({
          where: { userId: user.id, pinned: true, archived: false },
        }),
      ]);

    return NextResponse.json({
      success: true,
      data: {
        total,
        recovered,
        completed,
        archived,
        failed,
        pinned,
        active: total - archived,
      },
    });
  } catch (error) {
    console.error("GET DRAFT STATS ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
