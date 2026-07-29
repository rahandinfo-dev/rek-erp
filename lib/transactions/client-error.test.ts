import assert from "node:assert/strict";
import test from "node:test";
import { erpResponseError } from "./client-error.ts";

test("preserves a safe Kurdish server error and correlation id", async () => {
  const response = new Response(
    JSON.stringify({ message: "کۆگای بەرهەم بەس نییە.", correlationId: "req-1" }),
    { status: 409 },
  );
  assert.equal(
    await erpResponseError(response, "fallback"),
    "کۆگای بەرهەم بەس نییە. (req-1)",
  );
});

test("uses fallback for a non-JSON upstream error", async () => {
  const response = new Response("bad gateway", { status: 502 });
  assert.equal(await erpResponseError(response, "fallback"), "fallback");
});
