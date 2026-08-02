import assert from "node:assert/strict";
import test from "node:test";
import { canonicalLineTotal, decimalAdd } from "./decimal.ts";
import { formatReceiptMoney } from "./receipt-format.ts";

test("canonical transaction arithmetic is exact for fractional regression", () => {
  const totals = [
    canonicalLineTotal("100", "1.6", "0"),
    canonicalLineTotal("87", "1.5", "0"),
    canonicalLineTotal("26", "3", "0"),
  ];
  assert.deepEqual(totals, ["160", "130.5", "78"]);
  assert.equal(totals.reduce(decimalAdd, "0"), "368.5");
  assert.deepEqual(totals.map((value) => formatReceiptMoney(value, "IQD")), ["160 IQD", "130.5 IQD", "78 IQD"]);
  assert.equal(formatReceiptMoney("368.50", "IQD"), "368.5 IQD");
});
