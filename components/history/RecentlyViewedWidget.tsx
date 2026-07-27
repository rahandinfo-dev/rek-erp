"use client";

import Link from "next/link";
import { Clock3, Package, Pin } from "lucide-react";
import { useNavigationHistory } from "@/lib/history/provider";
import {
  HISTORY_MODULE_LABELS,
  relativeOpened,
} from "@/lib/history/types";
import { HistoryActionBadge } from "@/components/history/HistoryItemActions";
import { useT } from "@/components/i18n/LocaleProvider";

export default function RecentlyViewedWidget() {
  const { t } = useT();
  const { items } = useNavigationHistory();
  const top = items.slice(0, 10);

  return (
    <section
      aria-label="دوایین بینراوەکان"
      className="rek-card overflow-hidden p-0"
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <Clock3 size={18} className="text-primary" aria-hidden />
          <h2 className="text-lg font-black text-foreground">
            {t("history.recentlyViewed")}
          </h2>
        </div>
        <Link
          href="/dashboard/recent"
          className="text-xs font-bold text-primary hover:underline"
        >
          {t("history.viewAll")}
        </Link>
      </div>

      {top.length === 0 ? (
        <p className="px-5 py-8 text-sm text-muted-foreground">
          {t("history.emptyWidget")}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {top.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex items-center gap-3 px-5 py-3 transition hover:bg-muted/50"
              >
                <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
                  {item.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.thumbnail}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <Package size={16} className="text-muted-foreground" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-bold text-foreground">
                      {item.title}
                    </span>
                    {item.pinned ? (
                      <Pin size={12} className="text-primary" aria-hidden />
                    ) : null}
                    <HistoryActionBadge action={item.action} />
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {item.subtitle ||
                      HISTORY_MODULE_LABELS[item.moduleKey] ||
                      item.moduleKey}{" "}
                    · {relativeOpened(item.openedAt)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
