import test from "node:test";
import assert from "node:assert/strict";
import { runPushEnableFlow } from "./push-flow.ts";

type Registration = { ready: true };
type Subscription = { endpoint: string };
const flowRegistration: Registration = { ready: true };
const flowSubscription: Subscription = { endpoint: "https://push.example/test" };
function deps(overrides: Partial<Parameters<typeof runPushEnableFlow<Registration, Subscription>>[0]> = {}) {
  return {
    supported: () => true,
    permission: async () => "granted" as NotificationPermission,
    registration: async () => flowRegistration,
    register: async () => flowRegistration,
    subscribe: async () => flowSubscription,
    ...overrides,
  };
}

test("supported browser with granted permission creates a subscription", async () => {
  assert.deepEqual(await runPushEnableFlow(deps()), { ok: true, subscription: flowSubscription });
});
test("unsupported browsers are classified before requesting permission", async () => {
  let requested = false;
  const result = await runPushEnableFlow(deps({ supported: () => false, permission: async () => { requested = true; return "granted"; } }));
  assert.deepEqual(result, { ok: false, reason: "UNSUPPORTED_BROWSER" });
  assert.equal(requested, false);
});
test("denied permission is classified and does not subscribe", async () => {
  let subscribed = false;
  const result = await runPushEnableFlow(deps({ permission: async () => "denied", subscribe: async () => { subscribed = true; return flowSubscription; } }));
  assert.deepEqual(result, { ok: false, reason: "PERMISSION_DENIED" });
  assert.equal(subscribed, false);
});
test("missing registration retries registration and classifies failure", async () => {
  assert.deepEqual(await runPushEnableFlow(deps({ registration: async () => null, register: async () => null })), { ok: false, reason: "SERVICE_WORKER_UNAVAILABLE" });
});
test("registration fallback supports a successful subscription", async () => {
  assert.deepEqual(await runPushEnableFlow(deps({ registration: async () => null })), { ok: true, subscription: flowSubscription });
});
test("missing/invalid VAPID and subscription errors are classified", async () => {
  assert.deepEqual(await runPushEnableFlow(deps({ subscribe: async () => null })), { ok: false, reason: "SUBSCRIPTION_FAILED" });
  assert.deepEqual(await runPushEnableFlow(deps({ subscribe: async () => { throw new Error("InvalidAccessError"); } })), { ok: false, reason: "SUBSCRIPTION_FAILED" });
  assert.deepEqual(await runPushEnableFlow(deps({ subscribe: async () => { throw new Error("VAPID_MISSING"); } })), { ok: false, reason: "VAPID_MISSING" });
  assert.deepEqual(await runPushEnableFlow(deps({ subscribe: async () => { throw new Error("VAPID_INVALID"); } })), { ok: false, reason: "VAPID_INVALID" });
  assert.deepEqual(await runPushEnableFlow(deps({ subscribe: async () => { throw new Error("PERSISTENCE_FAILED"); } })), { ok: false, reason: "PERSISTENCE_FAILED" });
});
