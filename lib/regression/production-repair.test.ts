import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("RTL search and password controls keep their physical left affordances", () => {
  const sharedSearch = read("components/ui/SearchInput.tsx");
  const globalCss = read("app/globals.css");
  assert.match(sharedSearch, /rek-search-field__icon/);
  assert.match(globalCss, /\.rek-search-field__icon[\s\S]*left: 0\.75rem/);
  assert.match(globalCss, /input\[type="search"\]/);
  assert.match(globalCss, /padding-left: 2\.75rem !important/);
  assert.match(globalCss, /padding-right: 2\.75rem !important/);

  for (const relativePath of readdirSync("components", { recursive: true })) {
    if (typeof relativePath !== "string" || !relativePath.endsWith(".tsx")) continue;
    const path = `components/${relativePath.replaceAll("\\", "/")}`;
    const source = read(path);
    if (!source.includes("<Search")) continue;
    assert.doesNotMatch(
      source,
      /<Search[\s\S]{0,280}(?:right-|start-|end-)/,
      `${path} must not position its search icon on the text side`
    );
  }

  const searchableFiles = [
    "components/forms/ProductPicker.tsx",
    "components/ui/DataTable.tsx",
    "components/products/ProductsBrowser.tsx",
    "components/inventory/InventoryFilters.tsx",
    "components/inventory/MovementHistoryClient.tsx",
    "components/dashboard/DashboardRail.tsx",
    "components/recycle/RecycleBin.tsx",
  ];

  for (const path of searchableFiles) {
    const source = read(path);
    assert.match(source, /<(?:Search|SearchInput)\b/, `${path} has a search affordance`);
    assert.match(
      source,
      /left-[\d.]+|SearchInput/,
      `${path} pins search to physical left`
    );
    assert.doesNotMatch(source, /<Search[\s\S]{0,260}(?:right-|start-|end-)/);
  }

  const picker = read("components/forms/ProductPicker.tsx");
  assert.match(picker, /<SearchInput/);

  const palette = read("components/command/CommandPalette.tsx");
  assert.match(palette, /dir="ltr"[\s\S]{0,220}flex-row[\s\S]{0,220}<Search/);

  const password = read("components/forms/PasswordInput.tsx");
  assert.match(password, /absolute inset-y-0 left-0/);
  assert.match(password, /pl-11 pr-3/);

  for (const path of [
    "components/forms/LoginForm.tsx",
    "components/forms/RegisterForm.tsx",
    "app/(auth)/reset-password/page.tsx",
  ]) {
    const source = read(path);
    assert.match(source, /<PasswordInput\b/);
    assert.doesNotMatch(source, /type="password"|type=\{[^}]*password/);
  }
});

test("confirmations use the shared centered dialog instead of browser confirms", () => {
  for (const path of [
    "components/activity/ActivityTimeline.tsx",
    "components/command/CommandPalette.tsx",
    "components/customers/DeleteCustomerButton.tsx",
    "components/dashboard/workspace/DashboardToolbar.tsx",
    "components/favorites/FavoritesSidebar.tsx",
    "components/invoices/InvoicesTable.tsx",
    "components/notifications/NotificationCenter.tsx",
    "components/sales/SalesTable.tsx",
    "components/suppliers/DeleteSupplierButton.tsx",
  ]) {
    const source = read(path);
    assert.doesNotMatch(source, /\b(?:window\.)?confirm\(/, path);
    assert.match(source, /useConfirmation/, path);
  }

  const provider = read("components/ui/ConfirmationProvider.tsx");
  const dialog = read("components/ui/ConfirmDialog.tsx");
  const sharedSurface = read("components/ui/CompactAlertDialog.tsx");
  const css = read("app/globals.css");
  assert.match(provider, /<ConfirmDialog/);
  assert.match(dialog, /<CompactAlertDialogContent/);
  assert.match(sharedSurface, /<AlertDialog\.Overlay/);
  assert.match(css, /\.rek-compact-alert-dialog[\s\S]*width: min\(420px, calc\(100vw - 2rem\)\)/);
  assert.match(sharedSurface, /rek-compact-alert-viewport/);
  assert.match(sharedSurface, /width: "min\(420px, calc\(100vw - 32px\)\)"/);
  assert.match(css, /\.rek-compact-alert-viewport[\s\S]*position: fixed[\s\S]*inset: 0[\s\S]*display: flex[\s\S]*justify-content: center/);
  assert.doesNotMatch(css, /\.rek-dialog\s*\{[^}]*max-width/);
});

test("production presentation cleanup remains enforced", () => {
  const rail = read("components/dashboard/DashboardRail.tsx");
  const header = read("components/dashboard/DashboardHeader.tsx");
  const css = read("app/globals.css");
  assert.match(rail, /w-\[260px\].*lg:w-\[300px\].*xl:w-\[320px\]/);
  assert.match(rail, /dir="auto"/);
  assert.match(header, /lg:w-\[18rem\].*xl:w-\[24rem\]/);
  assert.match(css, /\.rek-company-name[\s\S]*unicode-bidi:\s*plaintext/);

  const inventory = read("components/inventory/InventoryStockList.tsx");
  assert.doesNotMatch(inventory, /unitFirst/);
  const quantityFormatter = read("lib/utils/format.ts");
  assert.match(quantityFormatter, /formatQuantityWithUnit/);
  assert.match(quantityFormatter, /\\u2066/);
  assert.match(quantityFormatter, /compactSymbol/);

  const invoice = read("components/invoices/InvoiceDocument.tsx");
  assert.match(invoice, /formatQuantityWithUnit\(item\.quantity/);

  const card = read("components/products/ProductCard.tsx");
  const details = read("components/products/ProductDetails.tsx");
  assert.match(card, /aspect-\[4\/3\]/);
  assert.match(card, /object-contain/);
  assert.match(details, /object-contain p-4 sm:p-6/);

  const widgets = read("lib/dashboard/workspace/types.ts");
  assert.doesNotMatch(widgets, /active-alerts|ai-shortcut/);

  const hiddenNav = read("lib/navigation/visibility.ts");
  for (const href of [
    "/dashboard/releases",
    "/dashboard/version-history",
    "/dashboard/settings/numbering",
  ]) {
    assert.match(hiddenNav, new RegExp(href.replaceAll("/", "\\/")));
  }
});

test("active reads and server failures are guarded centrally", () => {
  const prisma = read("lib/prisma/db.ts");
  for (const model of [
    "Brand",
    "Category",
    "Customer",
    "Employee",
    "Invoice",
    "InvoiceTemplate",
    "Product",
    "Purchase",
    "Sale",
    "Supplier",
    "Unit",
    "Warehouse",
  ]) {
    assert.match(prisma, new RegExp(`"${model}"`));
  }
  assert.match(prisma, /deletedAt:\s*null/);
  assert.match(prisma, /"deletedAt" in currentWhere/);

  for (const path of [
    "lib/dashboard/home.ts",
    "lib/inventory/alerts.ts",
    "lib/inventory/query.ts",
    "lib/inventory/valuation.ts",
    "lib/notifications/stock.ts",
  ]) {
    assert.match(read(path), /"deletedAt" IS NULL/, path);
  }

  const response = read("lib/api/response.ts");
  const client = read("lib/api/client.ts");
  assert.match(response, /X-Error-Reference/);
  assert.match(response, /monitorError/);
  assert.match(client, /کۆدی بەدواداچوون/);
});
