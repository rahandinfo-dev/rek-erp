import {
  DASHBOARD_WS_PREFIX,
  type DashboardWorkspaceBundle,
} from "@/lib/dashboard/workspace/types";

function key(userId: string) {
  return `${DASHBOARD_WS_PREFIX}${userId}`;
}

export function readLocalDashboardWorkspace(
  userId: string
): DashboardWorkspaceBundle | null {
  if (typeof window === "undefined" || !userId) return null;
  try {
    const raw = localStorage.getItem(key(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DashboardWorkspaceBundle;
    if (!parsed || parsed.version !== 1 || parsed.userId !== userId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeLocalDashboardWorkspace(bundle: DashboardWorkspaceBundle) {
  if (typeof window === "undefined" || !bundle.userId) return;
  try {
    localStorage.setItem(
      key(bundle.userId),
      JSON.stringify({ ...bundle, updatedAt: Date.now() })
    );
  } catch {
    /* quota */
  }
}
