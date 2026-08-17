import "server-only";

import type { NextRequest } from "next/server";
import { db } from "@/lib/prisma/db";

export async function auditSuperAdmin(input: { superAdminId?: string | null; action: string; targetType?: string; targetId?: string; status?: string; metadata?: Record<string, unknown>; req?: NextRequest | Request }) {
  const req = input.req;
  const ipAddress = req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req?.headers.get("x-real-ip") || null;
  try {
    await db.superAdminAuditLog.create({ data: { superAdminId: input.superAdminId || null, action: input.action, targetType: input.targetType || null, targetId: input.targetId || null, status: input.status || "success", metadata: input.metadata ? JSON.parse(JSON.stringify(input.metadata)) : undefined, ipAddress, userAgent: req?.headers.get("user-agent") || null } });
  } catch (error) {
    console.error("SUPER_ADMIN_AUDIT_ERROR", error);
  }
}
