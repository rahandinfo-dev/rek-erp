import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/prisma/db";
import { auditSafe } from "@/lib/audit/log";

const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  username: z.string().trim().min(3).max(64).regex(/^[A-Za-z0-9_.-]+$/),
});

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, message: "تکایە سەرەتا بچۆ ژوورەوە." }, { status: 401 });

  const parsed = profileSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, message: "زانیارییەکان دروست نین." }, { status: 400 });

  const duplicate = await db.user.findFirst({ where: { username: parsed.data.username, NOT: { id: user.id } }, select: { id: true } });
  if (duplicate) return NextResponse.json({ success: false, message: "ئەم ناوی بەکارهێنەرە پێشتر بەکارهاتووە." }, { status: 409 });

  const updated = await db.user.update({ where: { id: user.id }, data: parsed.data, select: { id: true, fullName: true, username: true } });
  await auditSafe({
    companyId: user.companyId,
    userId: user.id,
    userName: updated.fullName,
    module: "SETTINGS",
    action: "UPDATE",
    entityType: "User",
    entityId: user.id,
    summary: "بەکارهێنەر زانیارییەکانی پرۆفایلی خۆی نوێکردەوە.",
    oldValue: { fullName: user.fullName, username: user.username },
    newValue: { fullName: updated.fullName, username: updated.username },
    req,
  });

  return NextResponse.json({ success: true, data: updated, message: "زانیارییەکانی بەکارهێنەر پاشەکەوتکرا." });
}
