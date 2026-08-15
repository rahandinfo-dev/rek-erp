#!/usr/bin/env node
/**
 * Verify a database matches prisma/schema.prisma.
 *
 * Reads every `model` from the schema, checks the corresponding table exists,
 * then exercises the exact read/write path used by registration
 * (findUnique on User by email + username, insert, read back, delete).
 *
 * Usage:
 *   node scripts/verify-db.mjs                 # uses DIRECT_URL || DATABASE_URL
 *   DATABASE_URL="postgresql://…" node scripts/verify-db.mjs
 */

import dotenv from "dotenv";
import { readFileSync } from "node:fs";
import pg from "pg";

const argv = process.argv.slice(2);
const envIndex = argv.indexOf("--env");
const envFile = envIndex !== -1 ? argv[envIndex + 1] : null;
if (envFile) {
  const loaded = dotenv.config({ path: envFile, override: true });
  if (loaded.error) {
    console.error(`[verify] Could not read env file: ${envFile}`);
    process.exit(1);
  }
  console.log(`[verify] Loaded environment from ${envFile}`);
} else {
  dotenv.config({ path: ".env.local" });
  dotenv.config();
}

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error("[verify] No DIRECT_URL or DATABASE_URL set.");
  process.exit(1);
}

function maskedTarget(raw) {
  try {
    const parsed = new URL(raw);
    return `${parsed.host}${parsed.pathname}`;
  } catch {
    return "(unparseable connection string)";
  }
}

const schema = readFileSync("prisma/schema.prisma", "utf8");
const models = [...schema.matchAll(/^model\s+(\w+)\s*\{/gm)].map((m) => m[1]);

console.log(`[verify] Target: ${maskedTarget(connectionString)}`);
console.log(`[verify] Models declared in schema: ${models.length}`);

const client = new pg.Client({
  connectionString,
  ssl: /localhost|127\.0\.0\.1/.test(connectionString)
    ? undefined
    : { rejectUnauthorized: false },
});

let failed = false;

try {
  await client.connect();

  const { rows } = await client.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
  );
  const present = new Set(rows.map((r) => r.tablename));

  const missing = models.filter((m) => !present.has(m));

  console.log(`[verify] Tables present in database: ${present.size}`);

  const spotlight = [
    "User",
    "Company",
    "Employee",
    "Customer",
    "Invoice",
    "Category",
    "Brand",
    "Notification",
    "AuditLog",
  ];
  for (const name of spotlight) {
    const mark = present.has(name) ? "OK  " : "MISS";
    console.log(`   [${mark}] ${name}`);
  }

  if (missing.length > 0) {
    failed = true;
    console.error(`\n[verify] MISSING ${missing.length} table(s):`);
    console.error("   " + missing.join(", "));
    console.error("\n[verify] Run: npx prisma migrate deploy");
  } else {
    console.log("\n[verify] All schema models have tables.");
  }

  if (present.has("User") && present.has("Company")) {
    const stamp = Date.now();
    const email = `verify+${stamp}@example.com`;
    const username = `verify_${stamp}`;

    console.log("\n[verify] Exercising registration read/write path…");

    const pre = await client.query(
      `SELECT "id" FROM "User" WHERE "email" = $1`,
      [email]
    );
    console.log(`   findUnique(email)    -> ${pre.rowCount} row(s) (expected 0)`);

    const preU = await client.query(
      `SELECT "id" FROM "User" WHERE "username" = $1`,
      [username]
    );
    console.log(`   findUnique(username) -> ${preU.rowCount} row(s) (expected 0)`);

    await client.query("BEGIN");
    try {
      const company = await client.query(
        `INSERT INTO "Company" ("id","name","email","createdAt","updatedAt")
         VALUES ($1,$2,$3,NOW(),NOW()) RETURNING "id"`,
        [`verify_c_${stamp}`, `Verify Co ${stamp}`, email]
      );
      const user = await client.query(
        `INSERT INTO "User"
           ("id","companyId","fullName","username","email","password",
            "verified","createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,false,NOW(),NOW()) RETURNING "id"`,
        [
          `verify_u_${stamp}`,
          company.rows[0].id,
          "Verify User",
          username,
          email,
          "hashed-placeholder",
        ]
      );
      console.log(`   create(user)         -> id ${user.rows[0].id}`);

      const readBack = await client.query(
        `SELECT "email" FROM "User" WHERE "email" = $1`,
        [email]
      );
      console.log(`   read back            -> ${readBack.rowCount} row(s) (expected 1)`);

      await client.query("ROLLBACK");
      console.log("   rolled back          -> no test data left behind");
      console.log("\n[verify] Registration path: PASS");
    } catch (error) {
      await client.query("ROLLBACK");
      failed = true;
      console.error("\n[verify] Registration path: FAIL");
      console.error(`   ${error.message}`);
    }
  }
} catch (error) {
  failed = true;
  console.error(`[verify] Connection/query error: ${error.message}`);
} finally {
  await client.end().catch(() => {});
}

process.exit(failed ? 1 : 0);
