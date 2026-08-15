import assert from "node:assert/strict";
import test from "node:test";
import {
  isMasterRecordVisible,
  masterDeleteData,
  masterRestoreData,
  requiredPreviousStateValue,
  sameCompany,
} from "./state.ts";

test("delete hides the authoritative row and restore reactivates the same row", () => {
  const original = {
    id: "product-1",
    companyId: "company-a",
    name: "Real product",
    relations: ["sale-item-1", "stock-row-1"],
    active: true,
    deletedAt: null as Date | null,
    deletedById: null as string | null,
  };
  const deletedAt = new Date("2026-08-14T12:00:00.000Z");

  const trashed = { ...original, ...masterDeleteData("user-1", deletedAt) };
  assert.equal(isMasterRecordVisible(trashed), false);
  assert.equal(trashed.id, original.id);
  assert.deepEqual(trashed.relations, original.relations);
  assert.equal(trashed.companyId, original.companyId);
  assert.equal(trashed.deletedById, "user-1");

  const restored = { ...trashed, ...masterRestoreData() };
  assert.equal(isMasterRecordVisible(restored), true);
  assert.equal(restored.id, original.id);
  assert.equal(restored.name, original.name);
  assert.deepEqual(restored.relations, original.relations);
});

test("trash access is company isolated", () => {
  assert.equal(sameCompany("company-a", "company-a"), true);
  assert.equal(sameCompany("company-a", "company-b"), false);
});

test("restore requires an authentic previous status", () => {
  const metadata = { previousValue: { status: "DRAFT" } };
  assert.equal(
    requiredPreviousStateValue(metadata, "status", ["DRAFT", "COMPLETED"] as const),
    "DRAFT"
  );
  assert.equal(
    requiredPreviousStateValue(null, "status", ["DRAFT", "COMPLETED"] as const),
    null
  );
  assert.equal(
    requiredPreviousStateValue(
      { previousValue: { status: "CANCELLED" } },
      "status",
      ["DRAFT", "COMPLETED"] as const
    ),
    null
  );
});
