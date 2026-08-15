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
import { useT } from "@/components/i18n/LocaleProvider";
import { useConfirmation } from "@/components/ui/ConfirmationProvider";

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
  const { t } = useT();
  const confirmAction = useConfirmation();
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
    const accepted = await confirmAction({
      title: t("common.confirm"),
      description: t("notifications.deleteAllConfirm"),
      confirmText: t("common.delete"),
    });
    if (!accepted) return;
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
                {t("notifications.unreadCount", { count: unreadCount })}
          </div>
          <h1 className="text-4xl font-black text-[#FFAE42]">
            {t("notifications.title")}
          </h1>
          <p className="mt-2 text-slate-500">
            {t("notifications.subtitle")}
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
            {t("notifications.markAllRead")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void deleteAll()}
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#FFAE42] px-4 font-semibold text-white transition hover:bg-[#E8942A] disabled:opacity-50"
          >
            <Trash2 size={16} />
            {t("notifications.deleteAll")}
          </button>
        </div>
      </div>

      <div className="grid gap-3 rounded-3xl border border-[rgba(255, 174, 66,0.1)] bg-white p-4 shadow-sm md:grid-cols-2 xl:grid-cols-4">
        <label className="relative block md:col-span-2 xl:col-span-1">
          <Search
            size={16}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#FFAE42]/50"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("notifications.searchPlaceholder")}
            className="h-11 w-full rounded-2xl border border-[rgba(255, 174, 66,0.12)] bg-[#FFF8EF] pr-4 pl-10 outline-none focus:border-[#FFAE42] focus:bg-white"
          />
        </label>

        <select
          value={status}
          onChange={(e) =>
            updateFilter(() => setStatus(e.target.value))
          }
          className="h-11 rounded-2xl border border-[rgba(255, 174, 66,0.12)] bg-[#FFF8EF] px-4 outline-none focus:border-[#FFAE42] focus:bg-white"
        >
          <option value="active">{t("common.active")}</option>
          <option value="unread">{t("notifications.statusUnread")}</option>
          <option value="read">{t("notifications.statusRead")}</option>
          <option value="deleted">{t("notifications.statusDeleted")}</option>
          <option value="all">{t("common.all")}</option>
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
          <option value="">{t("notifications.allPriorities")}</option>
          {PRIORITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-3xl border border-[rgba(255, 174, 66,0.1)] bg-white shadow-sm">
        {loading ? (
          <p className="px-6 py-16 text-center text-slate-500">{t("common.wait")}</p>
        ) : items.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Bell className="mx-auto text-[#FFAE42]/40" size={36} />
            <h2 className="mt-4 text-xl font-bold text-slate-700">
              {t("notifications.emptyTitle")}
            </h2>
            <p className="mt-2 text-slate-500">
              {t("notifications.emptyBody")}
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
                        {t("common.new")}
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
                      {t("notifications.open")}
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
                        {item.isRead ? t("notifications.markUnread") : t("notifications.markRead")}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void deleteOne(item.id)}
                        className="inline-flex h-10 items-center gap-1 rounded-2xl border border-red-200 px-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        <Trash2 size={14} />
                        {t("common.delete")}
                      </button>
                    </>
                  ) : (
                    <span className="inline-flex h-10 items-center rounded-2xl bg-slate-100 px-3 text-sm text-slate-500">
                      {t("notifications.history")}
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
          {t("notifications.pageOf", {
            page: pagination.page,
            totalPages: pagination.totalPages,
            total: pagination.total,
          })}
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
            {t("common.prevPage")}
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
            {t("common.next")}
          </button>
        </div>
      </div>
    </div>
  );
}
