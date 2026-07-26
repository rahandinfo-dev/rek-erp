"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Boxes, Package, Warehouse } from "lucide-react";
import {
  PRIORITY_LABELS,
  priorityClass,
} from "@/lib/notifications/labels";
import { onNotificationsChanged } from "@/lib/notifications/bus";
import { isAlertsPanelKind } from "@/lib/notifications/kinds";
import type {
  NotificationCategory,
  NotificationPriority,
} from "@/lib/prisma/client";

export type InventoryAlertItem = {
  id: string;
  title: string;
  message: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  isRead: boolean;
  href: string | null;
  timeAgo: string;
  date: string;
  kind?: string | null;
};

function iconFor(kind: string | null | undefined, category: NotificationCategory) {
  if (
    kind === "WAREHOUSE_LOW" ||
    kind === "WAREHOUSE_CAPACITY" ||
    kind === "WAREHOUSE_TRANSFER" ||
    category === "WAREHOUSE"
  ) {
    return Warehouse;
  }
  if (kind === "OUT_OF_STOCK") return Boxes;
  return Package;
}

export default function InventoryAlertsPanel({
  initialItems = [],
}: {
  initialItems?: InventoryAlertItem[];
}) {
  const [items, setItems] = useState(initialItems);

  useEffect(() => {
    let active = true;

    async function pull() {
      try {
        // Keep alerts synced with Notification Center (newest first).
        const res = await fetch(
          "/api/notifications?status=active&pageSize=30&page=1"
        );
        const json = await res.json();
        if (!active || !json.success || !json.data) return;

        const filtered = (json.data.items as InventoryAlertItem[]).filter(
          (item) =>
            isAlertsPanelKind(item.kind) ||
            ((item.category === "INVENTORY" ||
              item.category === "WAREHOUSE" ||
              item.category === "WARNING") &&
              (item.priority === "HIGH" || item.priority === "CRITICAL"))
        );
        setItems(filtered.slice(0, 8));
      } catch {
        /* keep last good snapshot */
      }
    }

    void pull();
    const id = window.setInterval(() => void pull(), 12000);
    const stop = onNotificationsChanged(() => {
      void pull();
    });
    return () => {
      active = false;
      window.clearInterval(id);
      stop();
    };
  }, []);

  return (
    <section className="rek-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-[rgba(255,174,66,0.08)] px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <AlertTriangle size={18} />
          </span>
          <div>
            <h2 className="text-lg font-black text-[#1f1218] sm:text-xl">
              Ø¦Ø§Ú¯Ø§Ø¯Ø§Ø±ÛŒÛŒÛ•Ú©Ø§Ù†ÛŒ Ú©Û†Ú¯Ø§
            </h2>
            <p className="text-xs text-slate-500">
              Ú•ÙˆÙˆØ¯Ø§ÙˆÛ•Ú©Ø§Ù†ÛŒ Ú•Ø§Ø³ØªÛ•Ù‚ÛŒÙ†Û•ÛŒ Ø¯Ø§ØªØ§Ø¨Û•ÛŒØ³ Â· Ù†ÙˆÛŽØªØ±ÛŒÙ† ÛŒÛ•Ú©Û•Ù…
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/notifications"
          className="text-xs font-bold text-[#FFAE42] hover:underline"
        >
          Ù†Ø§ÙˆÛ•Ù†Ø¯ÛŒ Ø¦Ø§Ú¯Ø§Ø¯Ø§Ø±ÛŒ
        </Link>
      </div>

      <div className="max-h-[420px] overflow-y-auto">
        {items.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <Package className="mx-auto text-[#FFAE42]/40" size={28} />
            <p className="mt-3 font-bold text-slate-600">
              Ù‡ÛŒÚ† Ø¦Ø§Ú¯Ø§Ø¯Ø§Ø±ÛŒÛŒÛ•Ú©ÛŒ Ú©Û†Ú¯Ø§ Ù†ÛŒÛŒÛ•
            </p>
          </div>
        ) : (
          <ul>
            {items.map((item) => {
              const Icon = iconFor(item.kind, item.category);
              const body = (
                <>
                  <span
                    className={`mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                      item.priority === "CRITICAL"
                        ? "bg-rose-500 text-white"
                        : "bg-amber-500 text-white"
                    }`}
                  >
                    <Icon size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-bold text-[#1f1218]">
                        {item.title}
                      </h3>
                      <span
                        className={`rounded-lg px-2 py-0.5 text-[10px] font-bold ${priorityClass(item.priority)}`}
                      >
                        {PRIORITY_LABELS[item.priority]}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">
                      {item.message}
                    </p>
                    <p className="mt-2 text-[11px] text-slate-400">
                      {item.timeAgo}
                    </p>
                  </div>
                </>
              );

              return (
                <li
                  key={item.id}
                  className="border-b border-slate-100 last:border-b-0"
                >
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="flex gap-3 px-5 py-4 transition hover:bg-[#FFF8EF]/55"
                    >
                      {body}
                    </Link>
                  ) : (
                    <div className="flex gap-3 px-5 py-4">{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
