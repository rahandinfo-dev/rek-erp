import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("sound persistence is independent from push registration", () => {
  const panel = readFileSync("components/pwa/NotificationPrefsPanel.tsx", "utf8");
  const soundHandler = panel.slice(panel.indexOf("async function toggleSound"), panel.indexOf("async function togglePush"));
  assert.match(soundHandler, /persist\(\{ soundEnabled: next \}\)/);
  assert.doesNotMatch(soundHandler, /getRegistration|subscribeToPush|Notification/);
});

test("playback rejection is handled with a Kurdish browser message", () => {
  const panel = readFileSync("components/pwa/NotificationPrefsPanel.tsx", "utf8");
  assert.match(panel, /تاقیکردنەوەی دەنگ/);
  assert.match(panel, /وێبگەڕ ڕێگە بە لێدانی دەنگ نەدا/);
  assert.match(panel, /type="button"/);
});

test("service worker failure only enters push error path", () => {
  const panel = readFileSync("components/pwa/NotificationPrefsPanel.tsx", "utf8");
  assert.match(panel, /ڕێکخستنی دەنگ نەگۆڕاوە/);
});
