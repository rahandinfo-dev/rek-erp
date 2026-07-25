import { parseQuickActionPrefs } from "@/lib/quick-actions/prefs";
import type { QuickActionPrefs } from "@/lib/quick-actions/types";

export async function fetchQuickActionPrefs(): Promise<QuickActionPrefs | null> {
  try {
    const res = await fetch("/api/quick-actions/prefs", { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.success || !json.data) return null;
    return parseQuickActionPrefs(
      json.data,
      json.data.userId || "",
      json.data.companyId || ""
    );
  } catch {
    return null;
  }
}

export async function syncQuickActionPrefs(
  prefs: QuickActionPrefs
): Promise<QuickActionPrefs | null> {
  try {
    const res = await fetch("/api/quick-actions/prefs", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(prefs),
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.success || !json.data) return null;
    return parseQuickActionPrefs(
      json.data,
      prefs.userId,
      prefs.companyId
    );
  } catch {
    return null;
  }
}
