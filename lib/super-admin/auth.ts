import "server-only";

import { createHmac, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { db } from "@/lib/prisma/db";
import { isStrongSuperAdminPassword } from "@/lib/super-admin/password-policy";

export { isStrongSuperAdminPassword } from "@/lib/super-admin/password-policy";

export const SUPER_ADMIN_COOKIE = "rek-super-admin-session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;
const DUMMY_HASH = "$2a$12$OQztWL61/Q5x2OPoP7R0B.Y.IaQbuUBScYSdaHePwutvVd5d5r7da";

function sessionPepper() {
  const value = process.env.SUPER_ADMIN_SESSION_PEPPER;
  if (value && value.length >= 16) return value;
  if (process.env.NODE_ENV !== "production") return "rek-development-super-admin-session-pepper";
  throw new Error("SUPER_ADMIN_SESSION_PEPPER must be set (min 16 chars) in production.");
}

function tokenHash(token: string) {
  return createHmac("sha256", sessionPepper()).update(token).digest("hex");
}

export async function getSuperAdminFromSessionToken(token: string | undefined | null) {
  if (!token) return null;
  const session = await db.superAdminSession.findUnique({
    where: { tokenHash: tokenHash(token) },
    select: {
      id: true,
      expiresAt: true,
      superAdmin: { select: { id: true, email: true, mustChangePassword: true, active: true } },
    },
  });
  if (!session || session.expiresAt <= new Date() || !session.superAdmin.active) return null;
  return { ...session.superAdmin, sessionId: session.id };
}

export const getCurrentSuperAdmin = cache(async () => {
  const store = await cookies();
  return getSuperAdminFromSessionToken(store.get(SUPER_ADMIN_COOKIE)?.value);
});

export async function authenticateSuperAdmin(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const admin = await db.superAdmin.findUnique({ where: { email: normalizedEmail } });
  const matched = await bcrypt.compare(password, admin?.passwordHash || DUMMY_HASH);
  if (!admin || !admin.active || !matched) return null;
  return admin;
}

export async function createSuperAdminSession(input: { superAdminId: string; ipAddress?: string | null; userAgent?: string | null }) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
  await db.superAdminSession.create({ data: { superAdminId: input.superAdminId, tokenHash: tokenHash(token), expiresAt, ipAddress: input.ipAddress || null, userAgent: input.userAgent || null } });
  return { token, expiresAt };
}

export async function changeSuperAdminPassword(input: { superAdminId: string; password: string; currentSessionId: string }) {
  if (!isStrongSuperAdminPassword(input.password)) throw new Error("WEAK_PASSWORD");
  const passwordHash = await bcrypt.hash(input.password, 12);
  await db.$transaction([
    db.superAdmin.update({ where: { id: input.superAdminId }, data: { passwordHash, mustChangePassword: false, passwordChangedAt: new Date() } }),
    db.superAdminSession.deleteMany({ where: { superAdminId: input.superAdminId, NOT: { id: input.currentSessionId } } }),
  ]);
}

export async function destroySuperAdminSession(sessionId: string) {
  await db.superAdminSession.deleteMany({ where: { id: sessionId } });
}

export function superAdminCookie(token: string, expiresAt: Date) {
  return { name: SUPER_ADMIN_COOKIE, value: token, options: { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" as const, path: "/", expires: expiresAt } };
}
