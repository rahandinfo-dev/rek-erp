import test from "node:test";
import assert from "node:assert/strict";
import { calculateIqd, getSubscriptionPricing, SUBSCRIPTION_IQD_PER_USD } from "./pricing.ts";

test("subscription pricing exposes all plans from one configurable exchange-rate service", () => {
  const pricing = getSubscriptionPricing();
  assert.equal(pricing.plans.length, 4);
  assert.equal(pricing.plans[0].plan, "ONE_MONTH");
  assert.equal(pricing.plans[3].durationMonths, null);
  assert.equal(pricing.exchangeRateIqdPerUsd, 1380);
  assert.deepEqual(pricing.plans.slice(0, 3).map((plan) => plan.totalDays), [30, 93, 372]);
  assert.deepEqual(pricing.plans.slice(0, 3).map((plan) => plan.bonusDays), [0, 3, 7]);
});

test("IQD conversion uses the fixed 1,380 IQD subscription rate", () => {
  assert.equal(SUBSCRIPTION_IQD_PER_USD, 1380);
  assert.equal(calculateIqd(5.99), 8266.2);
});
