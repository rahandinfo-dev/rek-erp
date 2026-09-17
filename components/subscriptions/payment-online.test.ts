import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("components/subscriptions/PaymentOnlineClient.tsx", "utf8");

test("payment plans select and scroll to payment methods without activating a subscription", () => {
  assert.match(source, /setSelectedPlan\(plan\)/);
  assert.match(source, /scrollIntoView\(\{ behavior: "smooth", block: "start" \}\)/);
  assert.match(source, /function selectPlan\(plan: SubscriptionPlanPrice\)[\s\S]*setSelectedPlan\(plan\)[\s\S]*scrollIntoView/);
});

test("provider cards use the three real configured QR asset sources and brand accents", () => {
  assert.match(source, /PAYMENT_QR_IMAGES\.fib/);
  assert.match(source, /PAYMENT_QR_IMAGES\.fastPay/);
  assert.match(source, /PAYMENT_QR_IMAGES\.superQi/);
  assert.match(source, /width=\{720\} height=\{720\}/);
  assert.match(source, /max-w-\[420px\]/);
  assert.match(source, /object-contain/);
  assert.match(source, /flex h-full flex-col/);
  assert.match(source, /FIB/);
  assert.match(source, /FastPay/);
  assert.match(source, /Super Qi/);
});

test("desktop and mobile payment layout remains responsive", () => {
  assert.match(source, /sm:grid-cols-2 xl:grid-cols-4/);
  assert.match(source, /md:grid-cols-3/);
  assert.match(source, /max-w-6xl/);
});

test("the page heading renders above the subscription banner", () => {
  assert.match(source, /<header><h1 className="text-3xl font-black text-primary sm:text-4xl">\{pageTitle\}<\/h1><\/header>\s*<section/);
  assert.doesNotMatch(source, /<section[^>]*>[\s\S]*?<h1[^>]*>\{pageTitle\}<\/h1>/);
  assert.doesNotMatch(source, /REK ERP Subscription|ShieldCheck/);
});
