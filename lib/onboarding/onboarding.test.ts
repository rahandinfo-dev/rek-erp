import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const schema = readFileSync("prisma/schema.prisma", "utf8");
const service = readFileSync("lib/onboarding/service.ts", "utf8");
const dashboardLayout = readFileSync("app/dashboard/layout.tsx", "utf8");
const route = readFileSync("app/api/onboarding/accept/route.ts", "utf8");
const experience = readFileSync("components/onboarding/OnboardingExperience.tsx", "utf8");

test("onboarding acceptance is versioned, durable, and blocks dashboard access", () => {
  assert.match(schema, /model UserOnboardingAcceptance/);
  assert.match(schema, /@@unique\(\[userId, version\]\)/);
  assert.match(schema, /acceptedAt DateTime @default\(now\(\)\)/);
  assert.match(service, /CURRENT_ONBOARDING_VERSION/);
  assert.match(service, /update: \{\}/);
  assert.match(dashboardLayout, /hasAcceptedCurrentOnboarding\(user\.id\)/);
  assert.match(dashboardLayout, /redirect\("\/onboarding"\)/);
  assert.match(route, /accepted: z\.literal\(true\)/);
  assert.match(route, /getCurrentUser\(\)/);
  assert.match(experience, /disabled=\{!accepted \|\| submitting\}/);
  assert.match(experience, /router\.replace\("\/dashboard"\)/);
});
