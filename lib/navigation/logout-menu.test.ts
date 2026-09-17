import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const primitives = readFileSync("components/dashboard/NavigationPrimitives.tsx", "utf8");
const shell = readFileSync("components/dashboard/DashboardShell.tsx", "utf8");
const rail = readFileSync("components/dashboard/DashboardRail.tsx", "utf8");

test("the side menu uses shared identity and real logout primitives", () => {
  assert.match(primitives, /export function NavigationBrand/);
  assert.match(primitives, /export function NavigationUserProfile/);
  assert.match(primitives, /export function NavigationToggle/);
  assert.match(primitives, /export function NavigationLogout/);
  assert.match(primitives, /fetch\("\/api\/auth\/logout", \{ method: "POST" \}\)/);
  assert.match(primitives, /router\.replace\("\/login"\)/);
  assert.match(rail, /<NavigationBrand/);
  assert.match(rail, /<NavigationUserProfile/);
  assert.match(rail, /<NavigationLogout/);
  assert.match(rail, /<NavigationToggle/);
  assert.match(primitives, /bg-sidebar/);
  assert.match(shell, /<DashboardRail/);
  assert.doesNotMatch(shell, /NavigationPresenter|navigationStyle/);
});
