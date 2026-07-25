import { db } from "@/lib/prisma/db";
import type {
  NotificationCategory,
  NotificationPriority,
  Prisma,
} from "@/app/generated/prisma/client";

export type CreateNotificationInput = {
  companyId: string;
  userId?: string | null;
  title: string;
  message: string;
  category: NotificationCategory;
  priority?: NotificationPriority;
  href?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
};

/**
 * Persist a notification forever. Soft-delete only hides it from the UI.
 * Failures are logged and never break the primary business action.
 */
export async function createNotification(input: CreateNotificationInput) {
  try {
    const row = await db.notification.create({
      data: {
        companyId: input.companyId,
        userId: input.userId ?? null,
        title: input.title,
        message: input.message,
        category: input.category,
        priority: input.priority ?? "NORMAL",
        href: input.href ?? null,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        metadata: input.metadata,
      },
    });

    // Web Push delivery is best-effort and never blocks the business write.
    void import("@/lib/pwa/push-server")
      .then(({ deliverNotificationPush }) =>
        deliverNotificationPush({
          notificationId: row.id,
          companyId: row.companyId,
          userId: row.userId,
          title: row.title,
          message: row.message,
          category: row.category,
          href: row.href,
          metadata: row.metadata,
          priority: row.priority,
        })
      )
      .catch((error) => {
        console.error("PUSH DELIVERY ERROR:", error);
      });

    return row;
  } catch (error) {
    console.error("CREATE NOTIFICATION ERROR:", error);
    return null;
  }
}

export async function notifySafe(
  input: CreateNotificationInput
): Promise<void> {
  await createNotification(input);
}

export function timeAgoKu(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);

  if (seconds < 60) return "ئێستا";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} خولەک پێش ئێستا`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} کاتژمێر پێش ئێستا`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ڕۆژ پێش ئێستا`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} مانگ پێش ئێستا`;
  const years = Math.floor(months / 12);
  return `${years} ساڵ پێش ئێستا`;
}
