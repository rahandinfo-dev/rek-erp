import { PrismaClient } from "@/lib/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    // Inventory writes intentionally perform several dependent reads and writes
    // in one interactive transaction. Prisma's 5 second default is too short
    // for a cold serverless connection and can close an otherwise healthy
    // transaction halfway through a stock movement.
    transactionOptions: {
      maxWait: 5_000,
      timeout: 20_000,
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
