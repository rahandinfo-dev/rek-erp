import type { DashboardWorkspaceBundle } from "@/lib/dashboard/workspace/types";

export async function fetchDashboardWorkspace(): Promise<DashboardWorkspaceBundle | null> {
  try {
    if (typeof navigator !== "undefined" && !navigator.onLine) return null;
    const res = await fetch("/api/dashboard/workspace", { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.success || !json.data) return null;
    return json.data as DashboardWorkspaceBundle;
  } catch {
    return null;
  }
}

export async function syncDashboardWorkspace(
  bundle: DashboardWorkspaceBundle
): Promise<DashboardWorkspaceBundle | null> {
  try {
    if (typeof navigator !== "undefined" && !navigator.onLine) return null;
    const res = await fetch("/api/dashboard/workspace", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bundle),
      keepalive: true,
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.success || !json.data) return null;
    return json.data as DashboardWorkspaceBundle;
  } catch {
    return null;
  }
}
