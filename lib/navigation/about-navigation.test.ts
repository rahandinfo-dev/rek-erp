import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

test("system purchase is translated and is immediately before dashboard in the home menu", () => {
  const sidebar = read("lib/navigation/sidebar.ts");
  const paymentIndex = sidebar.indexOf('href: "/dashboard/payment-online"');
  const dashboardIndex = sidebar.indexOf('href: "/dashboard"');
  assert.ok(paymentIndex >= 0 && paymentIndex < dashboardIndex);
  assert.match(read("lib/i18n/dictionaries/ckb.ts"), /paymentOnline:\s*["']کڕینی سیستەمی ڕێک["']/);
});

test("about navigation and page use the shared RTL design architecture", () => {
  assert.match(read("lib/navigation/sidebar.ts"), /href: "\/dashboard\/about"/);
  assert.match(read("lib/navigation/app-grid.ts"), /href: "\/dashboard\/about"/);
  const page = read("app/dashboard/about/page.tsx");
  assert.match(page, /dir="rtl"/);
  assert.match(page, /PageHeader/);
  assert.match(read("lib/about/rek-profile.ts"), /contact:/);
});

test("payment page title uses the server-resolved navigation label", () => {
  assert.match(read("app/dashboard/payment-online/page.tsx"), /pageTitle=\{tServer\.t\("nav\.paymentOnline"\)\}/);
  assert.match(read("components/subscriptions/PaymentOnlineClient.tsx"), /\{pageTitle\}/);
});
