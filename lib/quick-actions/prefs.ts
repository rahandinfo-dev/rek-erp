import { DEFAULT_PINNED } from "@/lib/quick-actions/registry";
import type { QuickActionId, QuickActionPrefs } from "@/lib/quick-actions/types";
import { QUICK_ACTION_IDS } from "@/lib/quick-actions/types";

const ID_SET = new Set<string>(QUICK_ACTION_IDS);

export function emptyQuickActionPrefs(
  userId: string,
  companyId: string
): QuickActionPrefs {
  return {
    version: 1,
    userId,
    companyId,
    pinnedIds: [...DEFAULT_PINNED],
    hiddenIds: [],
    orderByModule: {},
    updatedAt: Date.now(),
  };
}

function filterIds(ids: unknown): QuickActionId[] {
  if (!Array.isArray(ids)) return [];
  return ids.filter((id): id is QuickActionId => typeof id === "string" && ID_SET.has(id));
}

export function parseQuickActionPrefs(
  raw: unknown,
  userId: string,
  companyId: string
): QuickActionPrefs {
  const base = emptyQuickActionPrefs(userId, companyId);
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Partial<QuickActionPrefs>;
  const orderByModule: QuickActionPrefs["orderByModule"] = {};
  if (o.orderByModule && typeof o.orderByModule === "object") {
    for (const [mod, ids] of Object.entries(o.orderByModule)) {
      orderByModule[mod] = filterIds(ids);
    }
  }
  return {
    version: 1,
    userId,
    companyId,
    pinnedIds: filterIds(o.pinnedIds).length
      ? filterIds(o.pinnedIds).slice(0, 20)
      : base.pinnedIds,
    hiddenIds: filterIds(o.hiddenIds).slice(0, 40),
    orderByModule,
    updatedAt: Number(o.updatedAt || Date.now()),
  };
}

export function resetQuickActionPrefs(
  userId: string,
  companyId: string
): QuickActionPrefs {
  return emptyQuickActionPrefs(userId, companyId);
}
