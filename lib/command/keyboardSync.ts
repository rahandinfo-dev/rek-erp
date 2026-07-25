import type { KeyboardPrefs } from "@/lib/command/keyboardPrefs";

export async function fetchKeyboardPrefs(): Promise<KeyboardPrefs | null> {
  try {
    if (typeof navigator !== "undefined" && !navigator.onLine) return null;
    const res = await fetch("/api/keyboard/prefs", { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.success || !json.data) return null;
    return json.data as KeyboardPrefs;
  } catch {
    return null;
  }
}

export async function syncKeyboardPrefs(
  prefs: KeyboardPrefs
): Promise<KeyboardPrefs | null> {
  try {
    if (typeof navigator !== "undefined" && !navigator.onLine) return null;
    const res = await fetch("/api/keyboard/prefs", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prefs),
      keepalive: true,
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.success || !json.data) return null;
    return json.data as KeyboardPrefs;
  } catch {
    return null;
  }
}
