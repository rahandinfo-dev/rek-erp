import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("notification polling handles temporary failed responses without console-error spam", () => {
  const sync = readFileSync("components/notifications/NotificationSync.tsx", "utf8");
  const bell = readFileSync("components/notifications/NotificationBell.tsx", "utf8");
  assert.match(sync, /if \(!res\.ok\) return/);
  assert.match(bell, /if \(!res\.ok\) return/);
  assert.doesNotMatch(sync, /console\.error\("NotificationSync error/);
  assert.doesNotMatch(bell, /console\.error\(error\)/);
});
