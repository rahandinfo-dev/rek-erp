import type { SearchPreview } from "@/lib/search/types";

export type CommandIconKey =
  | "dashboard"
  | "product"
  | "customer"
  | "supplier"
  | "invoice"
  | "sale"
  | "purchase"
  | "warehouse"
  | "unit"
  | "employee"
  | "inventory"
  | "barcode"
  | "reports"
  | "settings"
  | "notification"
  | "plus"
  | "theme"
  | "search"
  | "sku"
  | "star"
  | "history"
  | "mic";

export type CommandCategory =
  | "Navigation"
  | "Creation"
  | "Editing"
  | "Searching"
  | "Reports"
  | "Settings"
  | "System"
  | "Inventory"
  | "Sales"
  | "Purchases"
  | "Warehouse"
  | "Analytics";

export type CommandSection =
  | "recent"
  | "action"
  | "navigate"
  | "result"
  | "favorites"
  | "history"
  | "popular"
  | "suggestion"
  | "context";

export type CommandActionId =
  | "toggle-theme"
  | "logout"
  | "refresh"
  | "print"
  | "focus-page-search"
  | "manual-save"
  | "open-cheat-sheet"
  | "duplicate-record";

export type CommandItem = {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  href?: string;
  editHref?: string | null;
  actionId?: CommandActionId;
  keywords: string[];
  section: CommandSection;
  category?: CommandCategory;
  icon: CommandIconKey;
  /** Binding id in keyboard prefs (e.g. nav-dashboard) */
  shortcutId?: string;
  /** Display shortcut label (resolved from prefs when possible) */
  shortcut?: string;
  /** Path prefixes where this command is especially relevant */
  contexts?: string[];
  type?: string;
  module?: string;
  updatedAt?: number | null;
  preview?: SearchPreview | null;
  exactMatch?: boolean;
  entityId?: string;
  entityType?: string;
};

export type CommandGroup = {
  key: string;
  label: string;
  items: CommandItem[];
};

export type PaletteMode = "search" | "commands";
