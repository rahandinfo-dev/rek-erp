"use client";

export const NOTIFICATIONS_CHANGED_EVENT = "rek:notifications-changed";

export type NotificationsChangedDetail = {
  reason?:
    | "poll"
    | "scan"
    | "mutation"
    | "mark-read"
    | "delete"
    | "manual";
  ids?: string[];
};

/** Broadcast so Bell, Center, Activity, Analytics, and Alerts stay in sync. */
export function emitNotificationsChanged(
  detail: NotificationsChangedDetail = { reason: "manual" }
) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(NOTIFICATIONS_CHANGED_EVENT, { detail })
  );
}

export function onNotificationsChanged(
  handler: (detail: NotificationsChangedDetail) => void
) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const listener = (event: Event) => {
    const custom = event as CustomEvent<NotificationsChangedDetail>;
    handler(custom.detail || { reason: "manual" });
  };

  window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, listener);
  return () => window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, listener);
}

const TOASTED_KEY = "rek-notif-toasted-ids";
const MAX_TOASTED = 200;

function readToasted(): string[] {
  try {
    const raw = sessionStorage.getItem(TOASTED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

function writeToasted(ids: string[]) {
  try {
    sessionStorage.setItem(
      TOASTED_KEY,
      JSON.stringify(ids.slice(-MAX_TOASTED))
    );
  } catch {
    // ignore quota / private mode
  }
}

export function wasNotificationToasted(id: string): boolean {
  return readToasted().includes(id);
}

export function markNotificationToasted(id: string) {
  const ids = readToasted();
  if (ids.includes(id)) return;
  ids.push(id);
  writeToasted(ids);
}
