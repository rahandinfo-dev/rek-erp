"use client";

import { urlBase64ToUint8Array } from "@/lib/pwa/detect";

const SW_URL = "/sw.js";

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }
  try {
    const reg = await navigator.serviceWorker.register(SW_URL, {
      scope: "/",
      updateViaCache: "none",
    });
    // Check for updates periodically while the tab is open.
    try {
      await reg.update();
    } catch {
      /* ignore */
    }
    return reg;
  } catch (error) {
    console.error("[pwa] service worker registration failed", error);
    return null;
  }
}

export async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }
  try {
    return (await navigator.serviceWorker.getRegistration("/")) || null;
  } catch {
    return null;
  }
}

export async function subscribeToPush(
  registration: ServiceWorkerRegistration
): Promise<PushSubscription | null> {
  if (!("PushManager" in window)) return null;

  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    await syncSubscriptionToServer(existing);
    return existing;
  }

  const res = await fetch("/api/pwa/vapid", { cache: "no-store" });
  const json = await res.json();
  if (!json.success || !json.data?.publicKey) return null;

  const sub = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(
      json.data.publicKey as string
    ) as BufferSource,
  });

  await syncSubscriptionToServer(sub);
  return sub;
}

export async function unsubscribeFromPush(
  registration?: ServiceWorkerRegistration | null
): Promise<void> {
  const reg = registration || (await getRegistration());
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) {
    await fetch("/api/pwa/subscribe", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }).catch(() => null);
    return;
  }
  const endpoint = sub.endpoint;
  try {
    await sub.unsubscribe();
  } catch {
    /* ignore */
  }
  await fetch("/api/pwa/subscribe", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint }),
  }).catch(() => null);
}

async function syncSubscriptionToServer(sub: PushSubscription) {
  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;

  await fetch("/api/pwa/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: {
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      },
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    }),
  });
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof Notification === "undefined") return "denied";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}
