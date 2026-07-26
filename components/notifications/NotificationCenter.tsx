"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  Search,
  Trash2,
  ExternalLink,
} from "lucide-react";
import {
  CATEGORY_LABELS,
  PRIMARY_CATEGORY_OPTIONS,
  PRIORITY_LABELS,
  PRIORITY_OPTIONS,
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
  deletedAt: string | null;
  href: string | null;
  timeAgo: string;
  date: string;
};

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export default function NotificationCenter() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1,
  });
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("active");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(id);
  }, [search]);

  useEffect(() => {
    let active = true;

    const params = new URLSearchParams({
      page: String(page),
      pageSize: "20",
      status,
    });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (category) params.set("category", category);
    if (priority) params.set("priority", priority);

    void fetch(`/api/notifications?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (!active || !json.success || !json.data) return;
        setItems(json.data.items);
        setPagination(json.data.pagination);
        setUnreadCount(json.data.unreadCount);
        setLoading(false);
      })
      .catch((error) => {
        console.error(error);
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page, status, category, priority, debouncedSearch, reloadKey]);

  useEffect(() => {
    return onNotificationsChanged(() => {
      setReloadKey((key) => key + 1);
    });
  }, []);

  function updateFilter(
    updater: () => void
  ) {
    setLoading(true);
    setPage(1);
    updater();
  }

  async function markRead(id: string, isRead = true) {
    setBusy(true);
    try {
      await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead }),
      });
      emitNotificationsChanged({ reason: "mark-read", ids: [id] });
    } finally {
      setBusy(false);
    }
  }

  async function markAllRead() {
    setBusy(true);
    try {
      await fetch("/api/notifications/mark-all-read", { method: "POST" });
      emitNotificationsChanged({ reason: "mark-read" });
    } finally {
      setBusy(false);
    }
  }

  async function deleteOne(id: string) {
    setBusy(true);
    try {
      await fetch(`/api/notifications/${id}`, { method: "DELETE" });
      emitNotificationsChanged({ reason: "delete", ids: [id] });
    } finally {
      setBusy(false);
    }
  }

  async function deleteAll() {
    if (!window.confirm("Ø¯ÚµÙ†ÛŒØ§ÛŒØª Ù„Û• Ø´Ø§Ø±Ø¯Ù†Û•ÙˆÛ•ÛŒ Ù‡Û•Ù…ÙˆÙˆ Ø¦Ø§Ú¯Ø§Ø¯Ø§Ø±ÛŒÛŒÛ•Ú©Ø§Ù†ØŸ")) return;
    setBusy(true);
    try {
      await fetch("/api/notifications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "soft" }),
      });
      emitNotificationsChanged({ reason: "delete" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-2xl bg-[#FFF8EF] px-3 py-1 text-sm font-bold text-[#FFAE42]">
            <Bell size={16} />
            {unreadCount} Ù†Û•Ø®ÙˆÛŽÙ†Ø¯Ø±Ø§Ùˆ
          </div>
          <h1 className="text-4xl font-black text-[#FFAE42]">
            Ù†Ø§ÙˆÛ•Ù†Ø¯ÛŒ Ø¦Ø§Ú¯Ø§Ø¯Ø§Ø±ÛŒ
          </h1>
          <p className="mt-2 text-slate-500">
            Ù‡Û•Ù…ÙˆÙˆ Ø¦Ø§Ú¯Ø§Ø¯Ø§Ø±ÛŒÛŒÛ•Ú©Ø§Ù† Ù„Û• Ø¯Ø§ØªØ§Ø¨Û•ÛŒØ³Û•ÙˆÛ• â€” Ù‡Û•Ù…ÛŒØ´Û• Ø¯Û•Ù…ÛŽÙ†Ù†Û•ÙˆÛ•.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void markAllRead()}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[rgba(255, 174, 66,0.15)] px-4 font-semibold text-[#FFAE42] transition hover:bg-[#FFF8EF] disabled:opacity-50"
          >
            <CheckCheck size={16} />
            Ø®ÙˆÛŽÙ†Ø¯Ù†Û•ÙˆÛ•ÛŒ Ù‡Û•Ù…ÙˆÙˆ
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void deleteAll()}
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#FFAE42] px-4 font-semibold text-white transition hover:bg-[#E8942A] disabled:opacity-50"
          >
            <Trash2 size={16} />
            Ø³Ú•ÛŒÙ†Û•ÙˆÛ•ÛŒ Ù‡Û•Ù…ÙˆÙˆ
          </button>
        </div>
      </div>

      <div className="grid gap-3 rounded-3xl border border-[rgba(255, 174, 66,0.1)] bg-white p-4 shadow-sm md:grid-cols-2 xl:grid-cols-4">
        <label className="relative block md:col-span-2 xl:col-span-1">
          <Search
            size={16}
            className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[#FFAE42]/50"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ú¯Û•Ú•Ø§Ù† Ù„Û• Ø¦Ø§Ú¯Ø§Ø¯Ø§Ø±ÛŒ..."
            className="h-11 w-full rounded-2xl border border-[rgba(255, 174, 66,0.12)] bg-[#FFF8EF] pr-10 pl-4 outline-none focus:border-[#FFAE42] focus:bg-white"
          />
        </label>

        <select
          value={status}
          onChange={(e) =>
            updateFilter(() => setStatus(e.target.value))
          }
          className="h-11 rounded-2xl border border-[rgba(255, 174, 66,0.12)] bg-[#FFF8EF] px-4 outline-none focus:border-[#FFAE42] focus:bg-white"
        >
          <option value="active">Ú†Ø§Ù„Ø§Ú©</option>
          <option value="unread">Ù†Û•Ø®ÙˆÛŽÙ†Ø¯Ø±Ø§Ùˆ</option>
          <option value="read">Ø®ÙˆÛŽÙ†Ø¯Ø±Ø§Ùˆ</option>
          <option value="deleted">Ø³Ú•Ø§ÙˆÛ• (Ù…ÛŽÚ˜ÙˆÙˆ)</option>
          <option value="all">Ù‡Û•Ù…ÙˆÙˆ</option>
        </select>

        <select
          value={category}
          onChange={(e) =>
            updateFilter(() => setCategory(e.target.value))
          }
          className="h-11 rounded-2xl border border-[rgba(255, 174, 66,0.12)] bg-[#FFF8EF] px-4 outline-none focus:border-[#FFAE42] focus:bg-white"
        >
          {PRIMARY_CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value || "all"} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={priority}
          onChange={(e) =>
            updateFilter(() => setPriority(e.target.value))
          }
          className="h-11 rounded-2xl border border-[rgba(255, 174, 66,0.12)] bg-[#FFF8EF] px-4 outline-none focus:border-[#FFAE42] focus:bg-white"
        >
          <option value="">Ù‡Û•Ù…ÙˆÙˆ Ø¦Ø§Ø³ØªÛ•Ú©Ø§Ù†</option>
          {PRIORITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-3xl border border-[rgba(255, 174, 66,0.1)] bg-white shadow-sm">
        {loading ? (
          <p className="px-6 py-16 text-center text-slate-500">Ú†Ø§ÙˆÛ•Ú•ÛŽ Ø¨Ú©Û•...</p>
        ) : items.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Bell className="mx-auto text-[#FFAE42]/40" size={36} />
            <h2 className="mt-4 text-xl font-bold text-slate-700">
              Ù‡ÛŒÚ† Ø¦Ø§Ú¯Ø§Ø¯Ø§Ø±ÛŒÛŒÛ•Ú© Ù†Û•Ø¯Û†Ø²Ø±Ø§ÛŒÛ•ÙˆÛ•
            </h2>
            <p className="mt-2 text-slate-500">
              ÙÙ„ØªÛ•Ø± ÛŒØ§Ù† Ú¯Û•Ú•Ø§Ù† Ø¨Ú¯Û†Ú•Û• Ø¨Û† Ø¨ÛŒÙ†ÛŒÙ†ÛŒ Ø¦Û•Ù†Ø¬Ø§Ù….
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((item) => (
              <li
                key={item.id}
                className={`flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6 ${
                  item.isRead ? "bg-white" : "bg-[#FFF8EF]/40"
                } ${item.deletedAt ? "opacity-70" : ""}`}
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold text-[#1f1218]">
                      {item.title}
                    </h3>
                    {!item.isRead && !item.deletedAt ? (
                      <span className="rounded-lg bg-[#FFAE42] px-2 py-0.5 text-[10px] font-bold text-white">
                        Ù†ÙˆÛŽ
                      </span>
                    ) : null}
                    <span
                      className={`rounded-lg px-2 py-0.5 text-[10px] font-bold ${priorityClass(item.priority)}`}
                    >
                      {PRIORITY_LABELS[item.priority]}
                    </span>
                    <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                      {CATEGORY_LABELS[item.category]}
                    </span>
                  </div>
                  <p className="text-sm leading-6 text-[#6b5560]">
                    {item.message}
                  </p>
                  <p className="text-xs text-slate-400">
                    {item.timeAgo} Â· {formatNotificationDate(item.date)}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="inline-flex h-10 items-center gap-1 rounded-2xl border px-3 text-sm font-semibold text-[#FFAE42] hover:bg-[#FFF8EF]"
                    >
                      Ú©Ø±Ø¯Ù†Û•ÙˆÛ•
                      <ExternalLink size={14} />
                    </Link>
                  ) : null}
                  {!item.deletedAt ? (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void markRead(item.id, !item.isRead)}
                        className="inline-flex h-10 items-center rounded-2xl border px-3 text-sm font-semibold disabled:opacity-50"
                      >
                        {item.isRead ? "Ù†Û•Ø®ÙˆÛŽÙ†Ø¯Ø±Ø§Ùˆ" : "Ø®ÙˆÛŽÙ†Ø¯Ø±Ø§Ùˆ"}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void deleteOne(item.id)}
                        className="inline-flex h-10 items-center gap-1 rounded-2xl border border-red-200 px-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        <Trash2 size={14} />
                        Ø³Ú•ÛŒÙ†Û•ÙˆÛ•
                      </button>
                    </>
                  ) : (
                    <span className="inline-flex h-10 items-center rounded-2xl bg-slate-100 px-3 text-sm text-slate-500">
                      Ù…ÛŽÚ˜ÙˆÙˆ
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        <p className="text-sm text-slate-500">
          Ù„Ø§Ù¾Û•Ú•Û• {pagination.page} Ù„Û• {pagination.totalPages} Â· Ú©Û†ÛŒ{" "}
          {pagination.total}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => {
              setLoading(true);
              setPage((p) => Math.max(1, p - 1));
            }}
            className="h-10 rounded-2xl border px-4 text-sm font-semibold disabled:opacity-40"
          >
            Ù¾ÛŽØ´ÙˆÙˆ
          </button>
          <button
            type="button"
            disabled={page >= pagination.totalPages || loading}
            onClick={() => {
              setLoading(true);
              setPage((p) => p + 1);
            }}
            className="h-10 rounded-2xl border px-4 text-sm font-semibold disabled:opacity-40"
          >
            Ø¯ÙˆØ§ØªØ±
          </button>
        </div>
      </div>
    </div>
  );
}
