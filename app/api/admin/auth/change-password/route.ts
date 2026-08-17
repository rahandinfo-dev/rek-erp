import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auditSuperAdmin } from "@/lib/super-admin/audit";
import { changeSuperAdminPassword, getCurrentSuperAdmin } from "@/lib/super-admin/auth";

const schema = z.object({ password: z.string().min(16).max(256) });

export async function POST(req: NextRequest) {
  const admin = await getCurrentSuperAdmin();
  if (!admin) return NextResponse.json({ success: false, code: "UNAUTHORIZED" }, { status: 401 });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ success: false, message: "وشەی نهێنی لاوازیە." }, { status: 400 });
  try {
    await changeSuperAdminPassword({ superAdminId: admin.id, currentSessionId: admin.sessionId, password: parsed.data.password });
    await auditSuperAdmin({ superAdminId: admin.id, action: "PASSWORD_CHANGED", targetType: "SuperAdmin", targetId: admin.id, req });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof Error && error.message === "WEAK_PASSWORD" ? "وشەی نهێنی دەبێت لانیکەم ١٦ پیت و پیتی گەورە، بچووک، ژمارە و نیشانەی تایبەت هەبێت." : "گۆڕینی وشەی نهێنی سەرنەکەوت." }, { status: 400 });
  }
}
