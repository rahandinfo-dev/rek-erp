#!/usr/bin/env node
/** Read-only production-safe ERP prerequisite and invariant verification. */
import pg from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("[erp-verify] DATABASE_URL is required (its value will never be printed).");
  process.exit(2);
}

const stamp = Date.now();
const labels = {
  sale: `CODEX_SALE_TEST_${stamp}`,
  purchase: `CODEX_PURCHASE_TEST_${stamp}`,
};
const client = new pg.Client({
  connectionString,
  ssl: /localhost|127\.0\.0\.1/.test(connectionString)
    ? undefined
    : { rejectUnauthorized: false },
});

const one = async (sql, params = []) => (await client.query(sql, params)).rows[0];
let failed = false;
try {
  await client.connect();
  await client.query("BEGIN TRANSACTION READ ONLY");
  const fixture = await one(`
    SELECT c.id AS "companyId", u.id AS "userId", p.id AS "productId",
           w.id AS "warehouseId", cu.id AS "customerId", s.id AS "supplierId"
    FROM "Company" c
    JOIN LATERAL (SELECT id FROM "User" WHERE "companyId"=c.id LIMIT 1) u ON true
    JOIN LATERAL (SELECT id FROM "Product" WHERE "companyId"=c.id AND active=true LIMIT 1) p ON true
    JOIN LATERAL (SELECT id FROM "Warehouse" WHERE "companyId"=c.id LIMIT 1) w ON true
    JOIN LATERAL (SELECT id FROM "Customer" WHERE "companyId"=c.id AND active=true LIMIT 1) cu ON true
    JOIN LATERAL (SELECT id FROM "Supplier" WHERE "companyId"=c.id AND active=true LIMIT 1) s ON true
    LIMIT 1`);
  if (!fixture) throw new Error("No company has all required sale/purchase fixtures.");
  console.log("[erp-verify] selected safe fixture IDs:", fixture);
  console.log("[erp-verify] reserved test labels:", labels);

  const mismatches = await one(`
    SELECT count(*)::int AS count FROM "Product" p
    WHERE p."currentStock" <> COALESCE(
      (SELECT sum(ws.quantity) FROM "WarehouseStock" ws
       WHERE ws."companyId"=p."companyId" AND ws."productId"=p.id), 0)`);
  const duplicateMovements = await one(`
    SELECT count(*)::int AS count FROM (
      SELECT "companyId", "referenceType", "referenceId", "productId", "warehouseId", count(*)
      FROM "InventoryTransaction"
      WHERE "referenceType" IN ('SALE','PURCHASE') AND "referenceId" IS NOT NULL
      GROUP BY 1,2,3,4,5 HAVING count(*) > 1
    ) duplicates`);
  const orphanDocuments = await one(`
    SELECT
      (SELECT count(*) FROM "Sale" s WHERE NOT EXISTS
        (SELECT 1 FROM "SaleItem" i WHERE i."saleId"=s.id))::int +
      (SELECT count(*) FROM "Purchase" p WHERE NOT EXISTS
        (SELECT 1 FROM "PurchaseItem" i WHERE i."purchaseId"=p.id))::int AS count`);

  for (const [name, result] of Object.entries({
    productWarehouseStockMismatches: mismatches,
    duplicateDocumentMovements: duplicateMovements,
    documentsWithoutItems: orphanDocuments,
  })) {
    const count = Number(result.count);
    console.log(`[erp-verify] ${name}: ${count}`);
    failed ||= count !== 0;
  }
  await client.query("ROLLBACK");
} catch (error) {
  failed = true;
  try { await client.query("ROLLBACK"); } catch { /* connection may be unavailable */ }
  console.error("[erp-verify] failed:", error instanceof Error ? error.message : String(error));
} finally {
  await client.end().catch(() => undefined);
}
process.exitCode = failed ? 1 : 0;
