/* REK ERP — Enterprise Service Worker
 *
 * Strategies:
 *  - App shell / static: CacheFirst (icons, fonts, offline page, manifest)
 *  - Next static chunks: CacheFirst (hashed, immutable)
 *  - Navigations: NetworkFirst → offline.html
 *  - /api/* and auth cookies: NetworkOnly (never cached)
 *  - Push: show OS notification with deep link + actions; dedupe by tag
 */

const VERSION = "rek-pwa-v1";
const SHELL_CACHE = `${VERSION}-shell`;
const STATIC_CACHE = `${VERSION}-static`;
const RUNTIME_CACHE = `${VERSION}-runtime`;

const PRECACHE = [
  "/offline.html",
  "/manifest.webmanifest",
  "/apple-touch-icon.png",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/maskable-192x192.png",
  "/icons/maskable-512x512.png",
  "/icons/favicon-32x32.png",
  "/logo.png",
];

const NEVER_CACHE_PATHS = [
  "/api/",
  "/login",
  "/register",
  "/verify-email",
  "/forgot-password",
  "/verify-reset-otp",
  "/reset-password",
];

function isNeverCache(url) {
  const path = url.pathname;
  if (path.startsWith("/api/")) return true;
  return NEVER_CACHE_PATHS.some(
    (p) => path === p || path.startsWith(p.endsWith("/") ? p : `${p}/`)
  );
}

function isStaticAsset(url) {
  if (url.pathname.startsWith("/uploads/")) return false;
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    /\.(?:js|css|woff2?|ttf|otf|png|jpg|jpeg|gif|webp|avif|svg|ico|map)$/i.test(
      url.pathname
    )
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await cache.addAll(PRECACHE);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("rek-pwa-") && !key.startsWith(VERSION))
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    // Never put HTML authenticated pages into a long-lived cache — only
    // keep a short runtime copy of successful same-origin navigations for
    // soft offline (shell), excluding auth routes.
    if (response && response.ok && response.type === "basic") {
      const url = new URL(request.url);
      if (!isNeverCache(url)) {
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(request, response.clone());
      }
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    const offline = await caches.match("/offline.html");
    return offline || new Response("Offline", { status: 503, statusText: "Offline" });
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok && response.type === "basic") {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never intercept API / auth — tokens and business data stay network-only.
  if (isNeverCache(url) || url.pathname.startsWith("/api/")) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  if (
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/offline.html" ||
    url.pathname === "/apple-touch-icon.png" ||
    url.pathname === "/logo.png" ||
    /\.(?:woff2?|ttf|otf)$/i.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  }
});

/* ---------------------------- Push notifications --------------------------- */

self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      let data = {
        title: "REK ERP",
        body: "ئاگاداری نوێ",
        url: "/dashboard/notifications",
        tag: "rek-general",
        category: "GENERAL",
        silent: false,
        actions: [],
      };

      try {
        if (event.data) {
          const parsed = event.data.json();
          data = { ...data, ...parsed };
        }
      } catch {
        try {
          data.body = event.data ? event.data.text() : data.body;
        } catch {
          /* ignore */
        }
      }

      const tag = data.tag || `rek-${data.id || data.category || "general"}`;

      // If a client already toasted this id, skip OS duplicate.
      if (data.id) {
        const clientsList = await self.clients.matchAll({
          type: "window",
          includeUncontrolled: true,
        });
        for (const client of clientsList) {
          client.postMessage({
            type: "REK_PUSH_RECEIVED",
            id: data.id,
            tag,
          });
        }
      }

      const options = {
        body: data.body || "",
        icon: data.icon || "/icons/icon-192x192.png",
        badge: data.badge || "/icons/favicon-48x48.png",
        tag,
        renotify: Boolean(data.renotify),
        silent: Boolean(data.silent),
        data: {
          url: data.url || "/dashboard/notifications",
          id: data.id || null,
          category: data.category || "GENERAL",
        },
        actions: Array.isArray(data.actions)
          ? data.actions.slice(0, 2)
          : [
              { action: "open", title: "کردنەوە" },
              { action: "dismiss", title: "داخستن" },
            ],
        vibrate: data.silent ? undefined : [100, 50, 100],
      };

      await self.registration.showNotification(data.title || "REK ERP", options);

      // Badge count when supported
      if ("setAppBadge" in self.navigator && typeof data.badgeCount === "number") {
        try {
          if (data.badgeCount > 0) await self.navigator.setAppBadge(data.badgeCount);
          else await self.navigator.clearAppBadge();
        } catch {
          /* ignore */
        }
      }
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  const notification = event.notification;
  notification.close();

  if (event.action === "dismiss") return;

  const targetUrl =
    (notification.data && notification.data.url) || "/dashboard/notifications";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of allClients) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            await client.navigate(targetUrl);
            return;
          }
          client.postMessage({ type: "REK_NAVIGATE", url: targetUrl });
          return;
        }
      }
      await self.clients.openWindow(targetUrl);
    })()
  );
});

self.addEventListener("notificationclose", () => {
  /* no-op — reserved for analytics */
});

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "REK_SKIP_WAITING") {
    self.skipWaiting();
  }
  if (data.type === "REK_CLEAR_BADGE" && "clearAppBadge" in self.navigator) {
    self.navigator.clearAppBadge().catch(() => {});
  }
});
