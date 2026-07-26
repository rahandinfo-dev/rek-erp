#!/usr/bin/env node
/**
 * Apply pending Prisma migrations before the Next.js build.
 *
 * Runs on Vercel so the deployed database always matches prisma/schema.prisma.
 * Skips (without failing) when no DATABASE_URL is configured, so builds in
 * environments without a database still succeed; any real migration failure is
 * propagated so a broken schema can never ship.
 */

import { spawnSync } from "node:child_process";

if (!process.env.DATABASE_URL) {
  console.warn("[db] DATABASE_URL not set — skipping `prisma migrate deploy`.");
  process.exit(0);
}

const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (result.status !== 0) {
  console.error("[db] `prisma migrate deploy` failed.");
  process.exit(result.status ?? 1);
}
