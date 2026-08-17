import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiRateLimited } from "@/lib/api/response";
import { clientKey, rateLimit } from "@/lib/security/rate-limit";
import { auditSuperAdmin } from "@/lib/super-admin/audit";
import { authenticateSuperAdmin, createSuperAdminSession, superAdminCookie } from "@/lib/super-admin/auth";
import { db } from "@/lib/prisma/db";

const schema = z.object({ email: z.string().trim().email(), password: z.string().min(1).max(256) });

export async function POST(req: NextRequest) {
  const limited = rateLimit(clientKey(req, "super-admin-login"), { limit: 5, windowMs: 15 * 60_000 });
  if (!limited.ok) return apiRateLimited(limited);
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ success: false, message: "زانیاری چوونەژوورەوە دروست نییە." }, { status: 400 });
  const admin = await authenticateSuperAdmin(parsed.data.email, parsed.data.password);
  if (!admin) {
    await auditSuperAdmin({ action: "LOGIN", status: "failed", metadata: { email: parsed.data.email.trim().toLowerCase() }, req });
    return NextResponse.json({ success: false, message: "ئیمەیڵ یان وشەی نهێنی دروست نییە." }, { status: 401 });
  }
  const session = await createSuperAdminSession({ superAdminId: admin.id, ipAddress: clientKey(req, "").replace(/^:/, ""), userAgent: req.headers.get("user-agent") });
  await Promise.all([
    db.superAdmin.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } }),
    auditSuperAdmin({ superAdminId: admin.id, action: "LOGIN", targetType: "SuperAdmin", targetId: admin.id, req }),
  ]);
  const response = NextResponse.json({ success: true, mustChangePassword: admin.mustChangePassword });
  const cookie = superAdminCookie(session.token, session.expiresAt);
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}
