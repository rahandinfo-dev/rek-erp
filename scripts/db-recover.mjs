#!/usr/bin/env node
/**
 * Inspect and repair Prisma migration history (P3009 recovery).
 *
 * `prisma migrate deploy` refuses to run while a migration is recorded as
 * failed. This reads the real error out of _prisma_migrations and, for a
 * database with no business data, clears the half-applied state so
 * `migrate deploy` can apply the migration cleanly.
 *
 * Never uses `db push` — the schema is always applied by `migrate deploy`.
 *
 * Usage:
 *   node scripts/db-recover.mjs                     # inspect only (default)
 *   node scripts/db-recover.mjs --reset             # drop objects + clear history
 *   node scripts/db-recover.mjs --reset --force     # allow reset even with data
 *   node scripts/db-recover.mjs --rebaseline        # clear history, mark 0_init applied
 *
 * Target: DIRECT_URL || DATABASE_URL (override by exporting DATABASE_URL).
 */

import dotenv from "dotenv";
import { spawnSync } from "node:child_process";
import pg from "pg";

const argv = process.argv.slice(2);
const args = new Set(argv);
const doReset = args.has("--reset");
const doRebaseline = args.has("--rebaseline");
const force = args.has("--force");

// Targeting anything other than the default .env must be explicit, so a
// production reset can never be run by accident.
const envIndex = argv.indexOf("--env");
const envFile = envIndex !== -1 ? argv[envIndex + 1] : null;
if (envFile) {
  const loaded = dotenv.config({ path: envFile, override: true });
  if (loaded.error) {
    console.error(`[recover] Could not read env file: ${envFile}`);
    process.exit(1);
  }
  console.log(`[recover] Loaded environment from ${envFile}`);
} else {
  dotenv.config();
}

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("[recover] No DIRECT_URL or DATABASE_URL set.");
  process.exit(1);
}

function maskedTarget(raw) {
  try {
    const u = new URL(raw);
    return `${u.host}${u.pathname}`;
  } catch {
    return "(unparseable connection string)";
  }
}

/**
 * Run the Prisma CLI against exactly the database this script inspected.
 * prisma.config.ts would otherwise resolve the URL from .env, which could point
 * somewhere else entirely.
 */
function runPrisma(prismaArgs) {
  return spawnSync("npx", ["prisma", ...prismaArgs], {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: {
      ...process.env,
      DATABASE_URL: connectionString,
      DIRECT_URL: connectionString,
    },
  });
}

const client = new pg.Client({
  connectionString,
  ssl: /localhost|127\.0\.0\.1/.test(connectionString)
    ? undefined
    : { rejectUnauthorized: false },
});

await client.connect();
console.log(`[recover] Target: ${maskedTarget(connectionString)}\n`);

async function tableExists(name) {
  const { rows } = await client.query(
    `SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=$1`,
    [name]
  );
  return rows.length > 0;
}

async function listTables() {
  const { rows } = await client.query(
    `SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`
  );
  return rows.map((r) => r.tablename);
}

async function showHistory() {
  if (!(await tableExists("_prisma_migrations"))) {
    console.log("[recover] No _prisma_migrations table — no migration history.");
    return [];
  }
  const { rows } = await client.query(
    `SELECT migration_name, started_at, finished_at, rolled_back_at,
            applied_steps_count, logs
       FROM "_prisma_migrations" ORDER BY started_at`
  );
  if (rows.length === 0) {
    console.log("[recover] Migration history is empty.");
    return rows;
  }
  console.log("[recover] Migration history:");
  for (const r of rows) {
    const state = r.rolled_back_at
      ? "ROLLED BACK"
      : r.finished_at
        ? "APPLIED"
        : "FAILED";
    console.log(`  - ${r.migration_name}: ${state}`);
    console.log(`      steps applied: ${r.applied_steps_count}`);
    if (!r.finished_at && r.logs) {
      console.log("      ---- recorded error ----");
      for (const line of String(r.logs).split("\n")) {
        console.log(`      ${line}`);
      }
      console.log("      ------------------------");
    }
  }
  return rows;
}

async function businessRowCount() {
  if (!(await tableExists("User"))) return 0;
  const { rows } = await client.query(`SELECT COUNT(*)::int AS n FROM "User"`);
  return rows[0].n;
}

async function dropEverything() {
  // Drop tables then enum types, avoiding DROP SCHEMA (needs schema ownership
  // that managed providers may not grant to the application role).
  const tables = await listTables();
  if (tables.length > 0) {
    const list = tables.map((t) => `"public"."${t}"`).join(", ");
    await client.query(`DROP TABLE IF EXISTS ${list} CASCADE`);
    console.log(`[recover] Dropped ${tables.length} table(s).`);
  } else {
    console.log("[recover] No tables to drop.");
  }

  const { rows: types } = await client.query(
    `SELECT t.typname FROM pg_type t
       JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public' AND t.typtype = 'e'`
  );
  for (const t of types) {
    await client.query(`DROP TYPE IF EXISTS "public"."${t.typname}" CASCADE`);
  }
  if (types.length > 0) console.log(`[recover] Dropped ${types.length} enum type(s).`);
}

try {
  const history = await showHistory();
  const tables = await listTables();
  console.log(
    `\n[recover] Tables in public: ${tables.length}` +
      (tables.length ? ` (${tables.slice(0, 8).join(", ")}${tables.length > 8 ? ", …" : ""})` : "")
  );

  const failed = history.filter((r) => !r.finished_at && !r.rolled_back_at);

  if (!doReset && !doRebaseline) {
    console.log(
      `\n[recover] Inspect-only. Failed migrations: ${failed.length}.` +
        (failed.length
          ? "\n[recover] Re-run with --reset to clear a database that holds no business data."
          : "")
    );
    process.exit(0);
  }

  if (doReset) {
    const users = await businessRowCount();
    console.log(`\n[recover] Rows in "User": ${users}`);
    if (users > 0 && !force) {
      console.error(
        "[recover] Refusing to reset: the database contains user data. " +
          "Re-run with --force only if you are certain this data is disposable."
      );
      process.exit(1);
    }
    await dropEverything();
    console.log("[recover] Migration history cleared with the tables.");
  }

  if (doRebaseline) {
    if (await tableExists("_prisma_migrations")) {
      await client.query(`DELETE FROM "_prisma_migrations"`);
      console.log("[recover] Cleared migration history (schema left intact).");
    }
  }
} finally {
  await client.end().catch(() => {});
}

if (doRebaseline) {
  console.log("[recover] Marking 0_init as applied…");
  const r = runPrisma(["migrate", "resolve", "--applied", "0_init"]);
  process.exit(r.status ?? 0);
}

if (doReset) {
  console.log("\n[recover] Applying migrations with `prisma migrate deploy`…");
  const r = runPrisma(["migrate", "deploy"]);
  if (r.status !== 0) {
    console.error(
      "\n[recover] migrate deploy failed. Re-run the inspect mode to read the " +
        "SQL error recorded in _prisma_migrations."
    );
    process.exit(r.status ?? 1);
  }
  console.log("\n[recover] Done. Verify with: npm run db:verify");
}
