import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync("app/globals.css", "utf8");
const navigation = readFileSync("components/dashboard/NavigationPrimitives.tsx", "utf8");
const globalError = readFileSync("app/global-error.tsx", "utf8");

test("semantic theme tokens keep navigation and portal content readable", () => {
  assert.match(css, /--sidebar-destructive:/);
  assert.match(css, /--destructive-foreground:/);
  assert.match(css, /\.rek-sidebar \{[\s\S]*color: var\(--sidebar-foreground\)/);
  assert.match(css, /\.rek-sidebar \.rek-nav-item \{[\s\S]*color: var\(--sidebar-foreground\)/);
  assert.match(css, /\.rek-sidebar \.rek-navigation-user \{[\s\S]*background: var\(--sidebar-accent\)/);
  assert.match(css, /\.rek-sidebar \.rek-navigation-logout \{[\s\S]*color: var\(--sidebar-destructive\)/);
  assert.match(css, /\[data-slot="dialog-content"\],[\s\S]*background: var\(--popover\)/);
  assert.doesNotMatch(css, /color-mix\(in srgb, var\(--muted-foreground\) 85%, transparent\)/);
  assert.match(navigation, /rek-navigation-user/);
  assert.match(navigation, /rek-navigation-logout/);
  assert.match(globalError, /bg-background text-foreground/);
  assert.match(globalError, /text-muted-foreground/);
});
