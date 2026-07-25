"use client";

import { useEffect, useRef } from "react";
import {
  emitNotificationsChanged,
  markNotificationToasted,
  onNotificationsChanged,
} from "@/lib/notifications/bus";
import {
  extractNotificationKind,
  isSyncToastKind,
} from "@/lib/notifications/kinds";
import { toastNotificationOnce } from "@/lib/notifications/toastKind";

type SyncItem = {
  id: string;
  title: string;
  message: string;
  date: string;
  kind?: string | null;
  metadata?: unknown;
};

const POLL_MS = 12_000;
const SCAN_EVERY = 5; // every 5th poll ≈ 60s inventory scan
const LAST_TS_KEY = "rek-notif-sync-last-ts";

function readLastTs(): number {
  try {
    const raw = sessionStorage.getItem(LAST_TS_KEY);
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function writeLastTs(ts: number) {
  try {
    sessionStorage.setItem(LAST_TS_KEY, String(ts));
  } catch {
    // ignore
  }
}

/**
 * Single dashboard-wide sync:
 * - generates Low/Out/Warehouse alerts via Prisma
 * - toasts new synced events
 * - broadcasts so Bell, Center, Activity, Analytics refresh together
 */
export default function NotificationSync() {
  const tickRef = useRef(0);
  const busyRef = useRef(false);
  const bootstrapped = useRef(false);
  const pullingRef = useRef(false);

  useEffect(() => {
    let active = true;

    async function pull(opts: { toast: boolean }) {
      if (pullingRef.current || !active) return;
      pullingRef.current = true;

      try {
        const res = await fetch(
          "/api/notifications?status=active&pageSize=30&page=1",
          { cache: "no-store" }
        );
        const json = await res.json();
        if (!active || !json.success || !json.data) return;

        const items = (json.data.items || []) as SyncItem[];
        let lastTs = readLastTs();

        // First visit in this tab: seed cursor, don't replay historical toasts.
        if (!bootstrapped.current) {
          bootstrapped.current = true;
          const newest = items[0]?.date
            ? new Date(items[0].date).getTime()
            : Date.now();
          lastTs = Math.max(lastTs, newest);
          writeLastTs(lastTs);
          emitNotificationsChanged({ reason: "poll" });
          return;
        }

        let maxTs = lastTs;

        for (const item of items) {
          const createdAt = new Date(item.date).getTime();
          if (!Number.isFinite(createdAt)) continue;
          if (createdAt > maxTs) maxTs = createdAt;
          if (createdAt <= lastTs) continue;

          const kind =
            item.kind ?? extractNotificationKind(item.metadata) ?? null;
          if (!isSyncToastKind(kind) || !opts.toast) continue;

          toastNotificationOnce({
            id: item.id,
            title: item.title,
            message: item.message,
            kind,
          });
        }

        if (maxTs > lastTs) writeLastTs(maxTs);
        emitNotificationsChanged({ reason: "poll" });
      } catch (error) {
        console.error("NotificationSync error:", error);
      } finally {
        pullingRef.current = false;
      }
    }

    async function scanAndToastCreated() {
      if (busyRef.current || !active) return;
      busyRef.current = true;
      try {
        const res = await fetch("/api/notifications/inventory-alerts", {
          cache: "no-store",
        });
        const json = await res.json();
        if (!json.success) return;

        const created = (json.data?.created || []) as Array<{
          kind: string;
          title: string;
          message: string;
          notificationId: string | null;
        }>;

        for (const alert of created) {
          if (!alert.notificationId) continue;
          toastNotificationOnce({
            id: alert.notificationId,
            title: alert.title,
            message: alert.message,
            kind: alert.kind,
          });
        }

        emitNotificationsChanged({
          reason: "scan",
          ids: created
            .map((a) => a.notificationId)
            .filter((id): id is string => Boolean(id)),
        });
      } catch (error) {
        console.error(error);
      } finally {
        busyRef.current = false;
      }
    }

    void (async () => {
      await scanAndToastCreated();
      await pull({ toast: true });
    })();

    const pollId = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      tickRef.current += 1;
      if (tickRef.current % SCAN_EVERY === 0) {
        void (async () => {
          await scanAndToastCreated();
          await pull({ toast: true });
        })();
      } else {
        void pull({ toast: true });
      }
    }, POLL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void pull({ toast: true });
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    // Mutations from forms: refresh + toast immediately.
    const stopBus = onNotificationsChanged((detail) => {
      if (detail.reason === "mutation" || detail.reason === "manual") {
        void pull({ toast: true });
      }
    });

    // When the service worker shows an OS push for an id, skip the in-app toast.
    function onSwMessage(event: MessageEvent) {
      const data = event.data;
      if (!data || data.type !== "REK_PUSH_RECEIVED") return;
      if (typeof data.id === "string") markNotificationToasted(data.id);
      emitNotificationsChanged({ reason: "poll", ids: [data.id].filter(Boolean) });
    }
    navigator.serviceWorker?.addEventListener("message", onSwMessage);

    return () => {
      active = false;
      window.clearInterval(pollId);
      document.removeEventListener("visibilitychange", onVisible);
      navigator.serviceWorker?.removeEventListener("message", onSwMessage);
      stopBus();
    };
  }, []);

  return null;
}
