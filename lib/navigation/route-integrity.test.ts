import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const ROOT = process.cwd();
const APP_ROOT = path.join(ROOT, "app");
const ROUTE_SOURCE_ROOTS = ["app", "components", "lib"];

function filesUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return filesUnder(fullPath);
    return entry.isFile() ? [fullPath] : [];
  });
}

function pagePattern(file: string): RegExp {
  const segments = path
    .relative(APP_ROOT, file)
    .split(path.sep)
    .slice(0, -1)
    .filter((segment) => !/^\(.+\)$/.test(segment) && !segment.startsWith("@"));
  const pathSegments = segments.map((segment) => {
    if (/^\[\.\.\..+\]$/.test(segment)) return ".+";
    if (/^\[\[\.\.\..+\]\]$/.test(segment)) return ".*";
    if (/^\[.+\]$/.test(segment)) return "[^/]+";
    return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  });
  return new RegExp(`^/${pathSegments.join("/") || ""}$`);
}

const pagePatterns = filesUnder(APP_ROOT)
  .filter((file) => /[\\/]page\.tsx$/.test(file))
  .map(pagePattern);

function isPageRoute(href: string) {
  const pathname = href.split("?")[0];
  return pagePatterns.some((pattern) => pattern.test(pathname));
}

function navigationTargets(): string[] {
  const targets = new Set<string>();
  const matcher = /(?:href\s*[:=]|router\.(?:push|replace)|(?<!\.)\bredirect)\s*\(?\s*["'](\/(?:dashboard|admin|login|register|verify-email|forgot-password|verify-reset-otp|reset-password|onboarding)(?:\/[^"'?]*)?)/g;

  for (const root of ROUTE_SOURCE_ROOTS) {
    for (const file of filesUnder(path.join(ROOT, root))) {
      if (!/\.(?:ts|tsx)$/.test(file) || /\.test\.tsx?$/.test(file)) continue;
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(matcher)) targets.add(match[1]);
    }
  }

  return [...targets].sort();
}

test("every static in-app navigation target resolves to an App Router page", () => {
  const missing = navigationTargets().filter((href) => !isPageRoute(href));
  assert.deepEqual(missing, []);
});

test("the canonical side menu consumes only routable dashboard destinations", () => {
  const shell = readFileSync(path.join(ROOT, "components/dashboard/DashboardShell.tsx"), "utf8");
  const rail = readFileSync(path.join(ROOT, "components/dashboard/DashboardRail.tsx"), "utf8");
  assert.match(shell, /<DashboardRail/);
  assert.doesNotMatch(shell, /NavigationPresenter|navigationStyle|rek:navigation-style/);
  assert.match(rail, /filterSidebarGroups/);
  assert.ok(
    navigationTargets()
      .filter((href) => href.startsWith("/dashboard"))
      .every(isPageRoute),
    "dashboard navigation targets must remain backed by page.tsx files",
  );
});
