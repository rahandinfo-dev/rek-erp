"use client";

import { urlBase64ToUint8Array } from "@/lib/pwa/detect";
import { runPushEnableFlow, type PushEnableFailure } from "@/lib/pwa/push-flow";
export type { PushEnableFailure } from "@/lib/pwa/push-flow";

const SW_URL = "/sw.js";
let registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

async function awaitActiveRegistration(registration: ServiceWorkerRegistration) {
  if (registration.active) return registration;
  const ready = navigator.serviceWorker.ready;
  const timeout = new Promise<never>((_, reject) =>
    window.setTimeout(() => reject(new Error("SERVICE_WORKER_UNAVAILABLE")), 12_000)
  );
  return Promise.race([ready, timeout]);
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }
  if (registrationPromise) return registrationPromise;
  registrationPromise = (async () => {
   try {
    const existing = await navigator.serviceWorker.getRegistration("/");
    const reg = existing ?? await navigator.serviceWorker.register(SW_URL, {
      scope: "/",
      updateViaCache: "none",
    });
    // Check for updates periodically while the tab is open.
    try {
      await reg.update();
    } catch {
      /* ignore */
    }
    return await awaitActiveRegistration(reg);
  } catch (error) {
    console.error("[pwa] service worker registration failed", error);
    registrationPromise = null;
    return null;
  }
  })();
  return registrationPromise;
}

export async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }
  try {
    const registration = await navigator.serviceWorker.getRegistration("/");
    return registration ? await awaitActiveRegistration(registration) : null;
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
  const json = await res.json().catch(() => ({}));
  if (res.status === 503 || json.code === "VAPID_MISSING") throw new Error("VAPID_MISSING");
  if (!res.ok || !json.success || !json.data?.publicKey) throw new Error("VAPID_INVALID");

  let applicationServerKey: BufferSource;
  try {
    applicationServerKey = urlBase64ToUint8Array(json.data.publicKey as string) as BufferSource;
    if ((applicationServerKey as Uint8Array).byteLength !== 65) throw new Error("invalid key length");
  } catch {
    throw new Error("VAPID_INVALID");
  }
  const sub = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey,
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

  const response = await fetch("/api/pwa/subscribe", {
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
  if (!response.ok) throw new Error("PERSISTENCE_FAILED");
}

/** One testable enable flow; it never reads or mutates the sound preference. */
export async function enablePush(
  dependencies: {
    permission: () => Promise<NotificationPermission>;
    registration: () => Promise<ServiceWorkerRegistration | null>;
    register: () => Promise<ServiceWorkerRegistration | null>;
    subscribe: (registration: ServiceWorkerRegistration) => Promise<PushSubscription | null>;
    supported: () => boolean;
  } = {
    permission: requestNotificationPermission,
    registration: getRegistration,
    register: registerServiceWorker,
    subscribe: subscribeToPush,
    supported: () =>
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      typeof Notification !== "undefined",
  }
): Promise<{ ok: true; subscription: PushSubscription } | { ok: false; reason: PushEnableFailure }> {
  return runPushEnableFlow(dependencies);
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof Notification === "undefined") return "denied";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}
