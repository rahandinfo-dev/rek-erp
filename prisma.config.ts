import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

// Match Next.js environment precedence. Loading only `.env` here caused the
// CLI to migrate a different database from the one used by the application
// whenever `.env.local` supplied the production connection.
dotenv.config({ path: ".env.local" });
dotenv.config();

/**
 * CLI-only configuration (generate / migrate / db push). The application
 * runtime builds its own connection in lib/prisma/db.ts.
 *
 * DIRECT_URL takes precedence when present: managed Postgres providers such as
 * Neon serve a pooled (PgBouncer) endpoint that cannot reliably run migration
 * DDL, so schema changes must go through the direct endpoint.
 *
 * The datasource is only overridden when a URL exists, so `prisma generate`
 * still succeeds during an install step that has no database configured.
 */
const url = process.env.DIRECT_URL || process.env.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  ...(url ? { datasource: { url } } : {}),
});
