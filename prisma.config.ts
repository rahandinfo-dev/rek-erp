import "dotenv/config";
import { defineConfig } from "prisma/config";

// `prisma generate` must succeed during Vercel's install step, where the
// datasource URL may not be injected yet. Only override the datasource when a
// URL is actually present; migrate/db push still pick it up normally.
const url = process.env.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  ...(url ? { datasource: { url } } : {}),
});
