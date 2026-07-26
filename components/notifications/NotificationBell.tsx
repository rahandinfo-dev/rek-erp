"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, ExternalLink } from "lucide-react";
import {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  formatNotificationDate,
  priorityClass,
} from "@/lib/notifications/labels";
import {
  emitNotificationsChanged,
  onNotificationsChanged,
} from "@/lib/notifications/bus";
import type {
  NotificationCategory,
  NotificationPriority,
} from "@/lib/prisma/client";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  isRead: boolean;
  href: string | null;
  timeAgo: string;
  date: string;
};

type ApiResponse = {
  success: boolean;
  data?: {
    items: NotificationItem[];
    unreadCount: number;
  };
};

export default function NotificationBell() {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch(
        "/api/notifications?status=active&pageSize=8&page=1"
      );
      const json = (await res.json()) as ApiResponse;
      if (json.success && json.data) {
        setItems(json.data.items);
        setUnreadCount(json.data.unreadCount);
      }
    } catch (error) {
      console.error(error);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function pull() {
      try {
        const res = await fetch(
          "/api/notifications?status=active&pageSize=8&page=1"
        );
        const json = (await res.json()) as ApiResponse;
        if (!active || !json.success || !json.data) return;
        setItems(json.data.items);
        setUnreadCount(json.data.unreadCount);
      } catch (error) {
        console.error(error);
      }
    }

    void pull();
    const poll = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      void pull();
    }, 20000);
    const stop = onNotificationsChanged(() => {
      void pull();
    });

    return () => {
      active = false;
      window.clearInterval(poll);
      stop();
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function markRead(id: string) {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      });
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, isRead: true } : item
        )
      );
      setUnreadCount((count) => Math.max(0, count - 1));
      emitNotificationsChanged({ reason: "mark-read", ids: [id] });
    } catch (error) {
      console.error(error);
    }
  }

  async function markAllRead() {
    try {
      await fetch("/api/notifications/mark-all-read", { method: "POST" });
      setItems((prev) => prev.map((item) => ({ ...item, isRead: true })));
      setUnreadCount(0);
      emitNotificationsChanged({ reason: "mark-read" });
    } catch (error) {
      console.error(error);
    }
  }

  async function openItem(item: NotificationItem) {
    if (!item.isRead) await markRead(item.id);
    setOpen(false);
    if (item.href) router.push(item.href);
    else router.push("/dashboard/notifications");
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        aria-label="Ø¦Ø§Ú¯Ø§Ø¯Ø§Ø±ÛŒÛŒÛ•Ú©Ø§Ù†"
        aria-expanded={open}
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) void load(true);
        }}
        className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FFF8EF] text-[#FFAE42] transition hover:bg-[#f5e6d4] sm:h-12 sm:w-12"
      >
        <Bell size={20} />
        {unreadCount > 0 ? (
          <span className="absolute -top-1 -left-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FFAE42] px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute left-0 z-50 mt-2 w-[min(92vw,380px)] overflow-hidden rounded-3xl border border-[rgba(255, 174, 66,0.12)] bg-white shadow-xl shadow-[#FFAE42]/10">
          <div className="flex items-center justify-between border-b border-[rgba(255, 174, 66,0.08)] px-4 py-3">
            <div>
              <h3 className="font-bold text-[#1f1218]">Ù†Ø§ÙˆÛ•Ù†Ø¯ÛŒ Ø¦Ø§Ú¯Ø§Ø¯Ø§Ø±ÛŒ</h3>
              <p className="text-xs text-[#6b5560]">
                {unreadCount} Ù†Û•Ø®ÙˆÛŽÙ†Ø¯Ø±Ø§Ùˆ
              </p>
            </div>
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="inline-flex items-center gap-1 rounded-xl px-2 py-1 text-xs font-semibold text-[#FFAE42] hover:bg-[#FFF8EF]"
            >
              <CheckCheck size={14} />
              Ø®ÙˆÛŽÙ†Ø¯Ù†Û•ÙˆÛ•ÛŒ Ù‡Û•Ù…ÙˆÙˆ
            </button>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {loading && items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">
                Ú†Ø§ÙˆÛ•Ú•ÛŽ Ø¨Ú©Û•...
              </p>
            ) : null}

            {!loading && items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">
                Ù‡ÛŒÚ† Ø¦Ø§Ú¯Ø§Ø¯Ø§Ø±ÛŒÛŒÛ•Ú© Ù†ÛŒÛŒÛ•
              </p>
            ) : null}

            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => void openItem(item)}
                className={`flex w-full flex-col gap-1 border-b border-slate-100 px-4 py-3 text-right transition hover:bg-[#FFF8EF]/60 ${
                  item.isRead ? "bg-white" : "bg-[#FFF8EF]/35"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold text-[#1f1218]">{item.title}</span>
                  <span
                    className={`shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-bold ${priorityClass(item.priority)}`}
                  >
                    {PRIORITY_LABELS[item.priority]}
                  </span>
                </div>
                <p className="line-clamp-2 text-sm text-[#6b5560]">
                  {item.message}
                </p>
                <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                  <span>{CATEGORY_LABELS[item.category]}</span>
                  <span>
                    {item.timeAgo} Â· {formatNotificationDate(item.date)}
                  </span>
                </div>
              </button>
            ))}
          </div>

          <Link
            href="/dashboard/notifications"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-2 border-t border-[rgba(255, 174, 66,0.08)] bg-[#FFF8EF]/50 px-4 py-3 text-sm font-bold text-[#FFAE42] transition hover:bg-[#FFF8EF]"
          >
            Ú©Ø±Ø¯Ù†Û•ÙˆÛ•ÛŒ Ù†Ø§ÙˆÛ•Ù†Ø¯ÛŒ Ø¦Ø§Ú¯Ø§Ø¯Ø§Ø±ÛŒ
            <ExternalLink size={14} />
          </Link>
        </div>
      ) : null}
    </div>
  );
}
