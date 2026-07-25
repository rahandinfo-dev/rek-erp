import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/prisma/db";
import { hashPassword, comparePassword } from "@/lib/auth/hash";
import { validatePassword } from "@/lib/validators/password";
import { auditSafe } from "@/lib/audit/log";
import { notifySafe } from "@/lib/notifications/create";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
  confirmPassword: z.string().min(8),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "تکایە سەرەتا بچۆ ژوورەوە." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "زانیاری نادروستە." },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword, confirmPassword } = parsed.data;

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        {
          success: false,
          message: "وشەی نهێنی نوێ و دووپاتکردنەوە یەک ناگرنەوە.",
        },
        { status: 400 }
      );
    }

    const validation = validatePassword(newPassword);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: validation.message || "وشەی نهێنی لاوازە." },
        { status: 400 }
      );
    }

    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { id: true, password: true, companyId: true },
    });

    if (!dbUser?.password) {
      return NextResponse.json(
        { success: false, message: "هەڵەیەک ڕوویدا." },
        { status: 400 }
      );
    }

    const ok = await comparePassword(currentPassword, dbUser.password);
    if (!ok) {
      return NextResponse.json(
        { success: false, message: "وشەی نهێنی ئێستا هەڵەیە." },
        { status: 400 }
      );
    }

    const hashed = await hashPassword(newPassword);
    await db.user.update({
      where: { id: user.id },
      data: { password: hashed },
    });

    await auditSafe({
      companyId: user.companyId,
      userId: user.id,
      module: "AUTH",
      action: "UPDATE",
      entityType: "User",
      entityId: user.id,
      summary: "وشەی نهێنی گۆڕدرا",
      req,
    });

    await notifySafe({
      companyId: user.companyId,
      userId: user.id,
      title: "وشەی نهێنی گۆڕدرا",
      message: "وشەی نهێنی هەژمارەکەت بە سەرکەوتوویی نوێکرایەوە.",
      category: "SYSTEM",
      priority: "NORMAL",
      href: "/dashboard/settings",
      entityType: "User",
      entityId: user.id,
    });

    return NextResponse.json({
      success: true,
      message: "وشەی نهێنی گۆڕدرا.",
    });
  } catch (error) {
    console.error("CHANGE PASSWORD ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
