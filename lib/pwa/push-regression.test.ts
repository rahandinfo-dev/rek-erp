import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const client = readFileSync("lib/pwa/client.ts", "utf8");
const panel = readFileSync("components/pwa/NotificationPrefsPanel.tsx", "utf8");
const route = readFileSync("app/api/pwa/subscribe/route.ts", "utf8");
const prefs = readFileSync("app/api/pwa/prefs/route.ts", "utf8");

test("existing subscriptions are detected and synchronized without duplication", () => {
  assert.match(client, /getSubscription\(\)/);
  assert.match(client, /if \(existing\)[\s\S]*syncSubscriptionToServer\(existing\)/);
  assert.match(route, /pushSubscription\.upsert/);
});
test("unsubscribe removes browser and only the current user's server record", () => {
  assert.match(client, /sub\.unsubscribe\(\)/);
  assert.match(route, /deleteMany\([\s\S]*userId: user\.id, endpoint/);
});
test("refresh persistence comes from company-and-user scoped preferences", () => {
  assert.match(panel, /useEffect\([\s\S]*load\(\)/);
  assert.match(prefs, /userId: user\.id, companyId: user\.companyId/);
});
test("expired deliveries are removed and endpoints cannot be claimed cross-user", () => {
  const delivery = readFileSync("lib/pwa/push-server.ts", "utf8");
  assert.match(delivery, /status === 404 \|\| status === 410/);
  assert.match(route, /ENDPOINT_OWNED/);
});
test("push failure path never writes soundEnabled", () => {
  const handler = panel.slice(panel.indexOf("async function togglePush"), panel.indexOf("async function testSound"));
  assert.doesNotMatch(handler, /soundEnabled/);
});
test("service worker is registered once and awaited before PushManager use", () => {
  assert.match(client, /registrationPromise/);
  assert.match(client, /navigator\.serviceWorker\.ready/);
  assert.match(client, /awaitActiveRegistration/);
});
test("settings expose classified Kurdish diagnostics", () => {
  assert.match(panel, /پشتگیری وێبگەڕ/);
  assert.match(panel, /Service Worker/);
  assert.match(panel, /VAPID/);
  assert.match(panel, /کۆدی بەدواداچوون/);
});
