import { NextResponse } from "next/server";
import { auditSuperAdmin } from "@/lib/super-admin/audit";
import { destroySuperAdminSession, getCurrentSuperAdmin, SUPER_ADMIN_COOKIE } from "@/lib/super-admin/auth";

export async function POST() {
  const admin = await getCurrentSuperAdmin();
  if (admin) {
    await Promise.all([destroySuperAdminSession(admin.sessionId), auditSuperAdmin({ superAdminId: admin.id, action: "LOGOUT", targetType: "SuperAdmin", targetId: admin.id })]);
  }
  const response = NextResponse.json({ success: true });
  response.cookies.set(SUPER_ADMIN_COOKIE, "", { httpOnly: true, expires: new Date(0), path: "/", sameSite: "strict" });
  return response;
}
