import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

test("payment-online navigation label is present in the active locale catalog", () => {
  assert.match(read("lib/i18n/dictionaries/ckb.ts"), /paymentOnline:\s*["'][^"']+["']/);
});

test("translator falls back to the default catalog and rail never renders a raw navigation key", () => {
  assert.match(read("lib/i18n/t.ts"), /table\[key\] \?\? fallbackTable\[key\]/);
  assert.match(read("components/dashboard/DashboardRail.tsx"), /translatedLabel === item\.labelKey \? "" : translatedLabel/);
});
