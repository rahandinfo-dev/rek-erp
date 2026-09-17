import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";

// Load the same runtime connection settings as the application without
// printing environment activity or connection details.
dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

async function readLine(prompt: string) {
  if (!process.stdin.isTTY) throw new Error("This command must be run interactively in a terminal.");
  process.stdout.write(prompt);
  return await new Promise<string>((resolve, reject) => {
    let value = "";
    const onData = (chunk: Buffer) => {
      const input = chunk.toString("utf8");
      if (input.includes("\u0003")) {
        cleanup();
        reject(new Error("Credential update cancelled."));
        return;
      }
      if (input.includes("\r") || input.includes("\n")) {
        cleanup();
        process.stdout.write("\n");
        resolve(value);
        return;
      }
      value += input;
    };
    const cleanup = () => process.stdin.off("data", onData);
    process.stdin.resume();
    process.stdin.once("error", reject);
    process.stdin.on("data", onData);
  });
}

async function readHiddenLine(prompt: string) {
  if (!process.stdin.isTTY || !process.stdin.setRawMode) {
    throw new Error("This command must be run interactively in a terminal that supports hidden input.");
  }
  process.stdout.write(prompt);
  return await new Promise<string>((resolve, reject) => {
    let value = "";
    const onData = (chunk: Buffer) => {
      for (const character of chunk.toString("utf8")) {
        if (character === "\u0003") {
          cleanup();
          reject(new Error("Credential update cancelled."));
          return;
        }
        if (character === "\r" || character === "\n") {
          cleanup();
          process.stdout.write("\n");
          resolve(value);
          return;
        }
        if (character === "\b" || character === "\u007f") {
          value = value.slice(0, -1);
          continue;
        }
        if (character >= " ") value += character;
      }
    };
    const cleanup = () => {
      process.stdin.setRawMode(false);
      process.stdin.off("data", onData);
    };
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.once("error", reject);
    process.stdin.on("data", onData);
  });
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL must be configured before running this command.");

const currentEmail = normalizeEmail(await readLine("Current SuperAdmin email: "));
const newEmail = normalizeEmail(await readLine("New SuperAdmin email: "));
const password = await readHiddenLine("New password (hidden): ");
const confirmation = await readHiddenLine("Confirm new password (hidden): ");

if (!/^\S+@\S+\.\S+$/.test(currentEmail) || !/^\S+@\S+\.\S+$/.test(newEmail)) {
  throw new Error("Both email addresses must be valid.");
}
if (password !== confirmation) throw new Error("The password confirmation does not match.");
if (password.length < 16 || password.length > 256) {
  throw new Error("The password must be between 16 and 256 characters.");
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

try {
  const target = await db.superAdmin.findUnique({ where: { email: currentEmail }, select: { id: true } });
  if (!target) throw new Error("No SuperAdmin exists with the supplied current email. No changes were made.");

  const passwordHash = await bcrypt.hash(password, 12);
  await db.$transaction(async (tx) => {
    const current = await tx.superAdmin.findUnique({ where: { id: target.id }, select: { email: true } });
    if (!current || current.email !== currentEmail) {
      throw new Error("The target SuperAdmin changed while this command was running. No changes were made.");
    }

    const emailOwner = await tx.superAdmin.findUnique({ where: { email: newEmail }, select: { id: true } });
    if (emailOwner && emailOwner.id !== target.id) {
      throw new Error("The requested new email already belongs to another SuperAdmin. No changes were made.");
    }

    await tx.superAdmin.update({
      where: { id: target.id },
      data: { email: newEmail, passwordHash, mustChangePassword: false, passwordChangedAt: new Date() },
    });
    await tx.superAdminSession.deleteMany({ where: { superAdminId: target.id } });
    await tx.superAdminAuditLog.create({
      data: {
        superAdminId: target.id,
        action: "CREDENTIALS_UPDATED_FROM_CLI",
        targetType: "SuperAdmin",
        targetId: target.id,
        metadata: { source: "scripts/update-super-admin-credentials" },
      },
    });
  }, { isolationLevel: "Serializable" });

  console.log("SuperAdmin credentials updated and existing sessions revoked.");
} finally {
  await db.$disconnect();
}
