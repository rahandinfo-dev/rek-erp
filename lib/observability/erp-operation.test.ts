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
