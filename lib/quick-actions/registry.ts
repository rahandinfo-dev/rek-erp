import { MODULE_ACTIONS } from "@/lib/bulk/modules";
import type { BulkModule } from "@/lib/bulk/types";
import type {
  QuickActionDef,
  QuickActionId,
  QuickActionModule,
  QuickActionRecord,
} from "@/lib/quick-actions/types";

/** Canonical action catalog */
export const ACTION_DEFS: Record<QuickActionId, QuickActionDef> = {
  view: {
    id: "view",
    label: "View",
    group: "navigate",
    shortcut: "Enter",
  },
  edit: {
    id: "edit",
    label: "Edit",
    group: "mutate",
    shortcut: "E",
    bulkAction: "edit",
    permission: "edit",
  },
  duplicate: {
    id: "duplicate",
    label: "Duplicate",
    group: "mutate",
    shortcut: "Ctrl+D",
    bulkAction: "duplicate",
    permission: "duplicate",
  },
  copy: {
    id: "copy",
    label: "Copy",
    group: "mutate",
    permission: "duplicate",
  },
  move: {
    id: "move",
    label: "Move",
    group: "mutate",
    destructive: true,
    lazy: true,
    bulkAction: "move",
    permission: "move",
  },
  archive: {
    id: "archive",
    label: "Archive",
    group: "mutate",
    destructive: true,
    bulkAction: "archive",
    permission: "archive",
  },
  unarchive: {
    id: "unarchive",
    label: "Unarchive",
    group: "mutate",
    bulkAction: "unarchive",
    permission: "unarchive",
  },
  soft_delete: {
    id: "soft_delete",
    label: "Soft Delete",
    group: "mutate",
    destructive: true,
    shortcut: "Delete",
    bulkAction: "delete",
    permission: "delete",
  },
  restore: {
    id: "restore",
    label: "Restore",
    group: "mutate",
    bulkAction: "restore",
    permission: "restore",
  },
  print: {
    id: "print",
    label: "Print",
    group: "export",
    shortcut: "Ctrl+P",
    bulkAction: "print",
    permission: "print",
  },
  export_pdf: {
    id: "export_pdf",
    label: "Export PDF",
    group: "export",
    lazy: true,
    bulkAction: "export_pdf",
    permission: "export_pdf",
  },
  export_excel: {
    id: "export_excel",
    label: "Export Excel",
    group: "export",
    lazy: true,
    bulkAction: "export_excel",
    permission: "export_excel",
  },
  export_csv: {
    id: "export_csv",
    label: "Export CSV",
    group: "export",
    lazy: true,
    bulkAction: "export_csv",
    permission: "export_csv",
  },
  share: {
    id: "share",
    label: "Share",
    group: "share",
  },
  copy_link: {
    id: "copy_link",
    label: "Copy Link",
    group: "share",
    shortcut: "Ctrl+Shift+C",
  },
  open_new_tab: {
    id: "open_new_tab",
    label: "Open in New Tab",
    group: "navigate",
  },
  favorite: {
    id: "favorite",
    label: "Add to Favorites",
    group: "meta",
  },
  pin: {
    id: "pin",
    label: "Pin",
    group: "meta",
  },
  timeline: {
    id: "timeline",
    label: "View Timeline",
    group: "advanced",
    lazy: true,
  },
  audit: {
    id: "audit",
    label: "View Audit History",
    group: "advanced",
    lazy: true,
  },
};

/** Default order per module (before user customization). */
export const DEFAULT_MODULE_ACTIONS: Record<string, QuickActionId[]> = {
  products: [
    "view",
    "edit",
    "duplicate",
    "copy",
    "archive",
    "soft_delete",
    "restore",
    "print",
    "export_csv",
    "export_excel",
    "export_pdf",
    "share",
    "copy_link",
    "open_new_tab",
    "favorite",
    "pin",
    "timeline",
    "audit",
  ],
  sales: [
    "view",
    "edit",
    "duplicate",
    "soft_delete",
    "restore",
    "print",
    "export_csv",
    "export_excel",
    "export_pdf",
    "share",
    "copy_link",
    "open_new_tab",
    "favorite",
    "pin",
    "timeline",
    "audit",
  ],
  purchases: [
    "view",
    "edit",
    "soft_delete",
    "restore",
    "print",
    "export_csv",
    "export_excel",
    "export_pdf",
    "share",
    "copy_link",
    "open_new_tab",
    "favorite",
    "pin",
    "timeline",
    "audit",
  ],
  invoices: [
    "view",
    "edit",
    "duplicate",
    "soft_delete",
    "restore",
    "print",
    "export_csv",
    "export_excel",
    "export_pdf",
    "share",
    "copy_link",
    "open_new_tab",
    "favorite",
    "pin",
    "timeline",
    "audit",
  ],
  customers: [
    "view",
    "edit",
    "duplicate",
    "copy",
    "archive",
    "soft_delete",
    "restore",
    "export_csv",
    "export_excel",
    "export_pdf",
    "print",
    "share",
    "copy_link",
    "open_new_tab",
    "favorite",
    "pin",
    "timeline",
    "audit",
  ],
  suppliers: [
    "view",
    "edit",
    "duplicate",
    "copy",
    "move",
    "archive",
    "soft_delete",
    "restore",
    "export_csv",
    "export_excel",
    "export_pdf",
    "print",
    "share",
    "copy_link",
    "open_new_tab",
    "favorite",
    "pin",
    "timeline",
    "audit",
  ],
  warehouses: [
    "view",
    "edit",
    "archive",
    "soft_delete",
    "restore",
    "export_csv",
    "export_excel",
    "share",
    "copy_link",
    "open_new_tab",
    "favorite",
    "pin",
    "timeline",
    "audit",
  ],
  employees: [
    "view",
    "edit",
    "archive",
    "soft_delete",
    "restore",
    "export_csv",
    "export_excel",
    "print",
    "share",
    "copy_link",
    "open_new_tab",
    "favorite",
    "pin",
    "timeline",
    "audit",
  ],
  reports: [
    "view",
    "print",
    "export_csv",
    "export_excel",
    "export_pdf",
    "share",
    "copy_link",
    "open_new_tab",
    "favorite",
    "pin",
  ],
  expenses: [
    "view",
    "export_csv",
    "export_excel",
    "share",
    "copy_link",
    "open_new_tab",
    "favorite",
    "pin",
  ],
  categories: [
    "view",
    "edit",
    "duplicate",
    "archive",
    "soft_delete",
    "restore",
    "export_csv",
    "export_excel",
    "share",
    "copy_link",
    "open_new_tab",
    "favorite",
    "pin",
    "timeline",
    "audit",
  ],
};

export const DEFAULT_PINNED: QuickActionId[] = [
  "view",
  "edit",
  "duplicate",
  "soft_delete",
  "export_csv",
  "print",
];

export function defsForModule(moduleKey: string): QuickActionDef[] {
  const ids =
    DEFAULT_MODULE_ACTIONS[moduleKey] ||
    DEFAULT_MODULE_ACTIONS.products ||
    [];
  return ids.map((id) => ACTION_DEFS[id]).filter(Boolean);
}

/**
 * Resolve visible actions for record(s) — permission + state aware.
 * Instant (no I/O); lazy defs marked for deferred section.
 */
export function resolveActions(input: {
  moduleKey: string;
  records: QuickActionRecord[];
  pinnedIds: QuickActionId[];
  hiddenIds: QuickActionId[];
  orderOverride?: QuickActionId[];
  includeLazy?: boolean;
  allowedPermissions?: Set<string> | null;
}): QuickActionDef[] {
  const {
    moduleKey,
    records,
    pinnedIds,
    hiddenIds,
    orderOverride,
    includeLazy = true,
    allowedPermissions,
  } = input;

  const baseOrder =
    orderOverride ||
    DEFAULT_MODULE_ACTIONS[moduleKey] ||
    DEFAULT_MODULE_ACTIONS.products ||
    [];

  const hidden = new Set(hiddenIds);
  const bulkAllowed = new Set(
    MODULE_ACTIONS[moduleKey as BulkModule] || []
  );

  const anyDeleted = records.some((r) => r.deleted);
  const allDeleted = records.length > 0 && records.every((r) => r.deleted);
  const anyArchived = records.some((r) => r.archived);
  const allArchived = records.length > 0 && records.every((r) => r.archived);
  const multi = records.length > 1;

  const ordered = [
    ...pinnedIds.filter((id) => baseOrder.includes(id)),
    ...baseOrder.filter((id) => !pinnedIds.includes(id)),
  ];

  const out: QuickActionDef[] = [];
  for (const id of ordered) {
    if (hidden.has(id)) continue;
    const def = ACTION_DEFS[id];
    if (!def) continue;
    if (!includeLazy && def.lazy) continue;

    if (def.permission && allowedPermissions && !allowedPermissions.has(def.permission)) {
      continue;
    }

    if (def.bulkAction && bulkAllowed.size > 0) {
      // Soft navigation/share actions skip bulk gate
      const needsBulk =
        def.group === "mutate" || def.group === "export";
      if (needsBulk && !bulkAllowed.has(def.bulkAction as never)) continue;
    }

    // State filters
    if (id === "restore" && !anyDeleted) continue;
    if (id === "soft_delete" && allDeleted) continue;
    if (id === "archive" && allArchived) continue;
    if (id === "unarchive" && !anyArchived) continue;
    if (multi && (id === "view" || id === "open_new_tab" || id === "edit")) {
      // Still allow edit via bulk; view/open_new_tab only single
      if (id === "view" || id === "open_new_tab") continue;
    }
    if (multi && (id === "pin" || id === "favorite" || id === "share" || id === "copy_link")) {
      // favorites/share work for first record only — keep available
    }

    out.push(def);
  }
  return out;
}

export function isQuickActionModule(
  key: string
): key is QuickActionModule {
  return key in DEFAULT_MODULE_ACTIONS;
}
