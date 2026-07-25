import webpush from "web-push";
import { db } from "@/lib/prisma/db";
import {
  DEFAULT_PUSH_CATEGORIES,
  parseCategoryMap,
  resolvePushCategory,
  type PushCategory,
} from "@/lib/pwa/categories";
import { extractNotificationKind } from "@/lib/notifications/kinds";

let configured = false;

function ensureWebPush() {
  if (configured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@rek.app";
  if (!publicKey || !privateKey) {
    console.warn("[pwa] VAPID keys missing — push delivery disabled");
    return false;
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export function getVapidPublicKey(): string | null {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null;
}

export type PushPayload = {
  id?: string;
  title: string;
  body: string;
  url?: string;
  tag?: string;
  category?: PushCategory;
  icon?: string;
  badge?: string;
  silent?: boolean;
  renotify?: boolean;
  badgeCount?: number;
  actions?: { action: string; title: string }[];
};

async function unreadBadgeCount(companyId: string, userId?: string | null) {
  try {
    return await db.notification.count({
      where: {
        companyId,
        deletedAt: null,
        isRead: false,
        ...(userId ? { OR: [{ userId }, { userId: null }] } : {}),
      },
    });
  } catch {
    return 0;
  }
}

function isQuietHours(options: unknown): boolean {
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    return false;
  }
  const opts = options as {
    silent?: boolean;
    quietStart?: string;
    quietEnd?: string;
  };
  if (opts.silent) return true;
  if (!opts.quietStart || !opts.quietEnd) return false;
  // HH:mm in Asia/Baghdad approximate via local server time if TZ set
  const now = new Date();
  const hh = now.getHours();
  const mm = now.getMinutes();
  const cur = hh * 60 + mm;
  const [sh, sm] = opts.quietStart.split(":").map(Number);
  const [eh, em] = opts.quietEnd.split(":").map(Number);
  if ([sh, sm, eh, em].some((n) => !Number.isFinite(n))) return false;
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  if (start === end) return false;
  if (start < end) return cur >= start && cur < end;
  // overnight window
  return cur >= start || cur < end;
}

/**
 * Deliver a Web Push for a persisted notification.
 * Never throws — business flows must not break on push failure.
 */
export async function deliverNotificationPush(input: {
  notificationId: string;
  companyId: string;
  userId?: string | null;
  title: string;
  message: string;
  category: string;
  href?: string | null;
  metadata?: unknown;
  priority?: string | null;
}) {
  if (!ensureWebPush()) return { sent: 0 };

  const kind = extractNotificationKind(input.metadata);
  const pushCategory = resolvePushCategory({
    category: input.category,
    kind,
    metadata: input.metadata,
  });

  const silent =
    input.priority === "LOW" ||
    pushCategory === "BACKUP_STATUS" ||
    pushCategory === "REPORTS_READY";

  try {
    // Target: specific user, or all users in company with matching prefs.
    const users = input.userId
      ? [{ id: input.userId }]
      : await db.user.findMany({
          where: { companyId: input.companyId },
          select: { id: true },
        });

    let sent = 0;
    const badgeCount = await unreadBadgeCount(
      input.companyId,
      input.userId
    );

    for (const u of users) {
      const prefs = await db.notificationPushPrefs.findUnique({
        where: { userId: u.id },
      });
      if (!prefs?.enabled) continue;

      const cats = parseCategoryMap(prefs.categories ?? DEFAULT_PUSH_CATEGORIES);
      if (!cats[pushCategory]) continue;

      const quiet = isQuietHours(prefs.options);
      const subscriptions = await db.pushSubscription.findMany({
        where: { userId: u.id, companyId: input.companyId },
      });

      const payload: PushPayload = {
        id: input.notificationId,
        title: input.title,
        body: input.message,
        url: input.href || "/dashboard/notifications",
        tag: `rek-notif-${input.notificationId}`,
        category: pushCategory,
        icon: "/icons/icon-192x192.png",
        badge: "/icons/favicon-48x48.png",
        silent: quiet || silent,
        renotify: false,
        badgeCount,
        actions: [
          { action: "open", title: "کردنەوە" },
          { action: "dismiss", title: "داخستن" },
        ],
      };

      const body = JSON.stringify(payload);

      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            body,
            { urgency: silent || quiet ? "low" : "normal", TTL: 60 * 60 }
          );
          sent += 1;
          await db.pushSubscription.update({
            where: { id: sub.id },
            data: { lastSeenAt: new Date() },
          });
        } catch (error: unknown) {
          const status =
            error && typeof error === "object" && "statusCode" in error
              ? Number((error as { statusCode?: number }).statusCode)
              : 0;
          // Gone / expired subscription
          if (status === 404 || status === 410) {
            await db.pushSubscription
              .delete({ where: { id: sub.id } })
              .catch(() => null);
          } else {
            console.error("[pwa] push send failed", status || error);
          }
        }
      }
    }

    return { sent };
  } catch (error) {
    console.error("[pwa] deliverNotificationPush", error);
    return { sent: 0 };
  }
}
