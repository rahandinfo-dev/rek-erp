import { MODULE_ACTIONS } from "@/lib/bulk/modules";
import type { BulkModule } from "@/lib/bulk/types";

/**
 * Permission model: company users may perform module actions from MODULE_ACTIONS.
 * Restricted actions are hidden automatically. Extensible for future RBAC.
 */
export function permissionsForModule(moduleKey: string): Set<string> {
  const list = MODULE_ACTIONS[moduleKey as BulkModule] || [];
  const set = new Set<string>(list as string[]);
  // Always-available soft actions
  set.add("view");
  set.add("share");
  set.add("copy_link");
  set.add("open_new_tab");
  set.add("favorite");
  set.add("pin");
  set.add("timeline");
  set.add("audit");
  set.add("copy");
  return set;
}

export function canPerform(
  moduleKey: string,
  permission: string | undefined
): boolean {
  if (!permission) return true;
  return permissionsForModule(moduleKey).has(permission);
}
