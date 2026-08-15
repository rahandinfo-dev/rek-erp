import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

const masterRoutes = [
  "products",
  "customers",
  "suppliers",
  "brands",
  "categories",
  "units",
] as const;

const restoreRoutes = [
  ...masterRoutes,
  "employees",
  "invoice-templates",
  "invoices",
  "purchases",
  "sales",
  "werehouses",
] as const;

test("restore routes explicitly opt in to trashed rows", () => {
  for (const moduleName of restoreRoutes) {
    const restoreRoute = read(`app/api/${moduleName}/[id]/restore/route.ts`);
    assert.match(
      restoreRoute,
      /deletedAt:\s*\{\s*not:\s*null\s*\}/,
      `${moduleName} restore must bypass the active-only Prisma guard`
    );
  }
});

test("every master delete records actor and timestamp and every restore clears them", () => {
  for (const moduleName of masterRoutes) {
    const deleteRoute = read(`app/api/${moduleName}/[id]/route.ts`);
    const restoreRoute = read(`app/api/${moduleName}/[id]/restore/route.ts`);
    assert.match(deleteRoute, /deletedAt:\s*new Date\(\)/, `${moduleName} delete timestamp`);
    assert.match(deleteRoute, /deletedById:\s*(?:user\.id|userId)/, `${moduleName} delete actor`);
    assert.match(restoreRoute, /deletedAt:\s*null/, `${moduleName} restore timestamp`);
    assert.match(restoreRoute, /deletedById:\s*null/, `${moduleName} restore actor`);
  }

  const warehouseDelete = read("app/api/werehouses/[id]/route.ts");
  const warehouseRestore = read("app/api/werehouses/[id]/restore/route.ts");
  assert.match(warehouseDelete, /deletedAt:\s*new Date\(\)/);
  assert.match(warehouseDelete, /deletedById:\s*user\.id/);
  assert.match(warehouseRestore, /deletedAt:\s*null/);

  const employeeDelete = read("app/api/employees/[id]/route.ts");
  const employeeRestore = read("app/api/employees/[id]/restore/route.ts");
  assert.match(employeeDelete, /deletedAt:\s*new Date\(\)/);
  assert.match(employeeDelete, /deletedById:\s*user\.id/);
  assert.match(employeeRestore, /requiredPreviousStateValue/);
});

test("trash operations scope records to company and permanent delete requires admin", () => {
  const listRoute = read("app/api/recycle-bin/route.ts");
  const detailRoute = read("app/api/recycle-bin/[id]/route.ts");
  const restoreRoute = read("app/api/recycle-bin/restore/route.ts");
  const purgeRoute = read("app/api/recycle-bin/purge/route.ts");
  const emptyRoute = read("app/api/recycle-bin/empty/route.ts");

  assert.match(listRoute, /companyId/);
  assert.match(detailRoute, /where:\s*\{ id, companyId: user\.companyId \}/);
  assert.match(restoreRoute, /companyId, status: "deleted"/);
  assert.match(purgeRoute, /companyId, status: "deleted"/);
  assert.match(purgeRoute, /isCompanyAdministrator/);
  assert.match(purgeRoute, /confirm:\s*z\.literal\(true\)/);
  assert.match(emptyRoute, /isCompanyAdministrator/);
  assert.match(emptyRoute, /confirmPhrase:\s*z\.literal\("EMPTY"\)/);
});

test("accounting deletes use cancel or void and restores require ledger state", () => {
  const saleDelete = read("app/api/sales/[id]/route.ts");
  const purchaseDelete = read("app/api/purchases/[id]/route.ts");
  const invoiceDelete = read("app/api/invoices/[id]/route.ts");
  const saleRestore = read("app/api/sales/[id]/restore/route.ts");
  const purchaseRestore = read("app/api/purchases/[id]/restore/route.ts");
  const invoiceRestore = read("app/api/invoices/[id]/restore/route.ts");

  assert.match(saleDelete, /status:\s*"CANCELLED"/);
  assert.doesNotMatch(saleDelete, /db\.sale\.delete\(/);
  assert.match(purchaseDelete, /status:\s*"CANCELLED"/);
  assert.doesNotMatch(purchaseDelete, /db\.purchase\.delete\(/);
  assert.match(invoiceDelete, /status:\s*"VOID"/);
  assert.doesNotMatch(invoiceDelete, /db\.invoice\.delete\(/);
  assert.match(saleRestore, /requiredPreviousStateValue/);
  assert.match(purchaseRestore, /requiredPreviousStateValue/);
  assert.match(invoiceRestore, /requiredPreviousStateValue/);
});

test("invoice templates preserve their authoritative record through trash", () => {
  const deleteRoute = read("app/api/invoice-templates/[id]/route.ts");
  const restoreRoute = read("app/api/invoice-templates/[id]/restore/route.ts");
  assert.match(deleteRoute, /deletedAt:\s*new Date\(\)/);
  assert.match(deleteRoute, /deletedById:\s*user\.id/);
  assert.match(deleteRoute, /isCompanyAdministrator/);
  assert.match(deleteRoute, /existing\._count\.invoices > 0/);
  assert.match(restoreRoute, /deletedAt:\s*null/);
  assert.match(restoreRoute, /deletedById:\s*null/);
});
