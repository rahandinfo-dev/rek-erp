#!/usr/bin/env node
/**
 * Apply pending Prisma migrations before the Next.js build.
 *
 * On Vercel a missing DATABASE_URL is fatal: silently skipping is what lets a
 * build report success while the production database stays empty. Outside CI
 * the step is skipped so local builds without a database still work.
 *
 * Neon note: migrations run against DIRECT_URL when set, because DDL over the
 * pooled (PgBouncer) endpoint can fail on advisory locks.
 */

import { spawnSync } from "node:child_process";

const isCI = Boolean(process.env.VERCEL || process.env.CI);
const migrationUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

function maskedTarget(raw) {
  try {
    const parsed = new URL(raw);
    return `${parsed.host}${parsed.pathname}`;
  } catch {
    return "(unparseable connection string)";
  }
}

if (!migrationUrl) {
  if (isCI) {
    console.error(
      "[db] DATABASE_URL is not set in this build environment. Prisma migrations " +
        "cannot run, which would deploy application code against an unprovisioned " +
        "database. Add DATABASE_URL to the project's environment variables."
    );
    process.exit(1);
  }
  console.warn("[db] DATABASE_URL not set — skipping `prisma migrate deploy`.");
  process.exit(0);
}

console.log(
  `[db] Applying migrations to ${maskedTarget(migrationUrl)}` +
    (process.env.DIRECT_URL ? " (via DIRECT_URL)" : "")
);

const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (result.status !== 0) {
  console.error("[db] `prisma migrate deploy` failed.");
  process.exit(result.status ?? 1);
}

console.log("[db] Migrations applied.");
