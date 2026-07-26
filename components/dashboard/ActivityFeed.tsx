"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Boxes,
  IdCard,
  Package,
  ShoppingBasket,
  ShoppingCart,
  Truck,
  Users,
  Warehouse,
  FileText,
  Settings,
  type LucideIcon,
} from "lucide-react";
import {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  priorityClass,
} from "@/lib/notifications/labels";
import { onNotificationsChanged } from "@/lib/notifications/bus";
import type {
  NotificationCategory,
  NotificationPriority,
} from "@/lib/prisma/client";

type ActivityItem = {
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

const CATEGORY_ICONS: Record<NotificationCategory, LucideIcon> = {
  PRODUCT: Package,
  INVENTORY: Boxes,
  SALE: ShoppingCart,
  PURCHASE: ShoppingBasket,
  CUSTOMER: Users,
  SUPPLIER: Truck,
  WAREHOUSE: Warehouse,
  INVOICE: FileText,
  EMPLOYEE: IdCard,
  SYSTEM: Settings,
  ERROR: AlertTriangle,
  WARNING: AlertTriangle,
};

export default function ActivityFeed({
  initialItems = [],
}: {
  initialItems?: ActivityItem[];
}) {
  const [items, setItems] = useState<ActivityItem[]>(initialItems);
  const [live, setLive] = useState(true);

  useEffect(() => {
    let active = true;

    async function pull() {
      try {
        const res = await fetch(
          "/api/notifications?status=active&pageSize=12&page=1"
        );
        const json = await res.json();
        if (!active || !json.success || !json.data) return;
        setItems(json.data.items);
        setLive(true);
      } catch {
        if (active) setLive(false);
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
      <div className="flex items-center justify-between border-b border-[rgba(255, 174, 66,0.08)] px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-[#FFF8EF] text-[#FFAE42]">
            <Activity size={18} />
          </span>
          <div>
            <h2 className="text-lg font-black text-[#1f1218] sm:text-xl">
              Ú†Ø§Ù„Ø§Ú©ÛŒ Ù†ÙˆÛŽ
            </h2>
            <p className="text-xs text-slate-500">
              Ù„Û• Ø¯Ø§ØªØ§Ø¨Û•ÛŒØ³ÛŒ Ø¦Ø§Ú¯Ø§Ø¯Ø§Ø±ÛŒÛŒÛ•Ú©Ø§Ù† Â· Ù†ÙˆÛŽØªØ±ÛŒÙ† ÛŒÛ•Ú©Û•Ù…
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
              live
                ? "bg-emerald-50 text-emerald-700"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                live ? "animate-pulse bg-emerald-500" : "bg-slate-400"
              }`}
            />
            {live ? "زیندوو" : "پەیوەندی نەما"}
          </span>
          <Link
            href="/dashboard/notifications"
            className="text-xs font-bold text-[#FFAE42] hover:underline"
          >
            Ù‡Û•Ù…ÙˆÙˆ
          </Link>
        </div>
      </div>

      <div className="max-h-[520px] space-y-0 overflow-y-auto">
        {items.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Activity className="mx-auto text-[#FFAE42]/35" size={32} />
            <p className="mt-3 font-bold text-slate-600">
              Ù‡ÛŽØ´ØªØ§ Ú†Ø§Ù„Ø§Ú©ÛŒ Ù†ÛŒÛŒÛ•
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Ú©Ø±Ø¯Ø§Ø±Û•Ú©Ø§Ù† Ù„ÛŽØ±Û• Ø¯Û•Ø±Ø¯Û•Ú©Û•ÙˆÙ†.
            </p>
          </div>
        ) : (
          <ul>
            {items.map((item, index) => {
              const Icon = CATEGORY_ICONS[item.category] || Activity;
              return (
                <li
                  key={item.id}
                  className="rek-activity-item border-b border-slate-100 last:border-b-0"
                  style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
                >
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="flex gap-3 px-5 py-4 transition hover:bg-[#FFF8EF]/55"
                    >
                      <ActivityRow item={item} Icon={Icon} />
                    </Link>
                  ) : (
                    <div className="flex gap-3 px-5 py-4">
                      <ActivityRow item={item} Icon={Icon} />
                    </div>
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

function ActivityRow({
  item,
  Icon,
}: {
  item: ActivityItem;
  Icon: LucideIcon;
}) {
  return (
    <>
      <span
        className={`mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
          item.isRead
            ? "bg-slate-100 text-slate-500"
            : "bg-[#FFAE42] text-white shadow-md shadow-[#FFAE42]/25"
        }`}
      >
        <Icon size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate font-bold text-[#1f1218]">{item.title}</h3>
          <span
            className={`rounded-lg px-2 py-0.5 text-[10px] font-bold ${priorityClass(item.priority)}`}
          >
            {PRIORITY_LABELS[item.priority]}
          </span>
        </div>
        <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">
          {item.message}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
          <span className="rounded-md bg-[#FFF8EF] px-2 py-0.5 font-semibold text-[#FFAE42]">
            {CATEGORY_LABELS[item.category]}
          </span>
          <span>{item.timeAgo}</span>
        </div>
      </div>
      {!item.isRead ? (
        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#FFAE42]" />
      ) : null}
    </>
  );
}
