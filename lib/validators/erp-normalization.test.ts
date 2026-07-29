import assert from "node:assert/strict";
import test from "node:test";
import {
  erpNumber,
  erpPositiveNumber,
  normalizeLocalizedNumber,
  optionalEntityId,
} from "./erp-normalization.ts";

test("normalizes Arabic and Persian digits and decimal separators", () => {
  assert.equal(normalizeLocalizedNumber("١٬٢٣٤٫٥٠"), "1234.50");
  assert.equal(normalizeLocalizedNumber("۱۲۵.۷"), "125.7");
});

test("ERP numeric schemas accept normalized strings and reject invalid values", () => {
  assert.equal(erpNumber("invalid").parse("٢٥٫٥"), 25.5);
  assert.equal(erpPositiveNumber("invalid").parse("1,250"), 1250);
  assert.equal(erpPositiveNumber("invalid").safeParse("٠").success, false);
  assert.equal(erpNumber("invalid").safeParse("not-a-number").success, false);
});

test("walk-in party IDs survive every JSON wire representation", () => {
  const serializedUndefined = JSON.parse(JSON.stringify({ partyId: undefined }));

  assert.equal(optionalEntityId.parse(serializedUndefined.partyId), "");
  assert.equal(optionalEntityId.parse(null), "");
  assert.equal(optionalEntityId.parse(""), "");
  assert.equal(optionalEntityId.parse("   "), "");
  assert.equal(optionalEntityId.parse(" customer-1 "), "customer-1");
  assert.equal(optionalEntityId.safeParse({ id: "customer-1" }).success, false);
});
