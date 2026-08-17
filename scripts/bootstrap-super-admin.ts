import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";
import { isStrongSuperAdminPassword } from "../lib/super-admin/password-policy.ts";

// This script runs directly in Node, outside Next.js. Use explicit relative
// TypeScript imports here instead of the app's `@/` alias used by lib/prisma/db.
dotenv.config({ path: ".env.local" });
dotenv.config();

const email = process.env.SUPER_ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
const password = process.env.SUPER_ADMIN_ONE_TIME_PASSWORD;

if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
  throw new Error("Set SUPER_ADMIN_BOOTSTRAP_EMAIL to a valid email before running this command.");
}
if (!password || !isStrongSuperAdminPassword(password)) {
  throw new Error("SUPER_ADMIN_ONE_TIME_PASSWORD must be at least 16 characters and contain upper/lowercase letters, a number, and a symbol.");
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL must be set before running this command.");
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

try {
  const existing = await db.superAdmin.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    throw new Error("A SuperAdmin already exists with this email. Bootstrap is intentionally single-use.");
  }

  await db.superAdmin.create({
    data: {
      email,
      passwordHash: await bcrypt.hash(password, 12),
      mustChangePassword: true,
    },
  });

  console.log("Super admin bootstrap complete. Change the one-time password at first login.");
} finally {
  await db.$disconnect();
}
