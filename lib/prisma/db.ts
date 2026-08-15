import { PrismaClient } from "@/lib/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const SOFT_DELETE_MODELS = new Set([
  "Brand",
  "Category",
  "Customer",
  "Employee",
  "Invoice",
  "InvoiceTemplate",
  "Product",
  "Purchase",
  "Sale",
  "Supplier",
  "Unit",
  "Warehouse",
]);

const ACTIVE_READ_OPERATIONS = new Set([
  "aggregate",
  "count",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "findUnique",
  "findUniqueOrThrow",
  "groupBy",
]);

function createPrismaClient() {
  return new PrismaClient({
    adapter,
    // Inventory writes intentionally perform several dependent reads and writes
    // in one interactive transaction. Prisma's 5 second default is too short
    // for a cold serverless connection and can close an otherwise healthy
    // transaction halfway through a stock movement.
    transactionOptions: {
      maxWait: 5_000,
      timeout: 20_000,
    },
  }).$extends({
    name: "exclude-soft-deleted-records",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (
            SOFT_DELETE_MODELS.has(model) &&
            ACTIVE_READ_OPERATIONS.has(operation)
          ) {
            const currentWhere =
              args && typeof args === "object" && "where" in args
                ? (args.where as Record<string, unknown> | undefined)
                : undefined;

            // Trash/recovery paths opt in explicitly with deletedAt. Every
            // ordinary read is active-only, including future modules that use
            // the shared Prisma client and forget a page-level predicate.
            if (!currentWhere || !("deletedAt" in currentWhere)) {
              (args as { where?: Record<string, unknown> }).where = {
                ...(currentWhere || {}),
                deletedAt: null,
              };
            }
          }

          return query(args);
        },
      },
    },
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db: PrismaClient =
  globalForPrisma.prisma ??
  (createPrismaClient() as unknown as PrismaClient);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
