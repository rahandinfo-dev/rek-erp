import assert from "node:assert/strict";
import test from "node:test";
import { databaseErrorDetails, publicErpError } from "./erp-operation.ts";

test("preserves the first nested PostgreSQL error", () => {
  const error = {
    code: "DriverAdapterError",
    cause: {
      cause: {
        code: "23505",
        constraint: "Sale_invoiceNo_key",
        table: "Sale",
        detail: "duplicate",
      },
    },
  };
  assert.deepEqual(databaseErrorDetails(error), {
    code: "DriverAdapterError",
    postgresCode: "23505",
    constraint: "Sale_invoiceNo_key",
    table: "Sale",
    column: undefined,
    detail: "duplicate",
    hint: undefined,
  });
  assert.equal(publicErpError(error).status, 409);
});

test("maps foreign-key failures to a validation response", () => {
  assert.equal(publicErpError({ cause: { code: "23503" } }).status, 400);
});

test("reports the original SQL error instead of a later 25P02", () => {
  const error = {
    code: "DriverAdapterError",
    cause: {
      code: "25P02",
      cause: {
        code: "23505",
        constraint: "NumberingCounter_companyId_moduleKey_periodKey_key",
        table: "NumberingCounter",
        detail: "Key already exists",
        hint: "Use an atomic upsert",
      },
    },
  };

  assert.deepEqual(databaseErrorDetails(error), {
    code: "DriverAdapterError",
    postgresCode: "23505",
    constraint: "NumberingCounter_companyId_moduleKey_periodKey_key",
    table: "NumberingCounter",
    column: undefined,
    detail: "Key already exists",
    hint: "Use an atomic upsert",
  });
});

test("handles cyclic driver causes without losing the outer Prisma code", () => {
  const error: { code: string; cause?: unknown } = { code: "P2003" };
  error.cause = error;
  assert.equal(databaseErrorDetails(error).code, "P2003");
  assert.equal(publicErpError(error).status, 400);
});
