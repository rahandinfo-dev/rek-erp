"use client";

import Link from "next/link";
import { FilePenLine, Package, PlusCircle } from "lucide-react";
import { useNavigationHistory } from "@/lib/history/provider";
import {
  HISTORY_MODULE_LABELS,
  relativeOpened,
  type HistoryAction,
} from "@/lib/history/types";

export default function HistoryActionListWidget({
  action,
  title,
}: {
  action: Extract<HistoryAction, "edited" | "created">;
  title: string;
}) {
  const { items } = useNavigationHistory();
  const list = items.filter((i) => i.action === action).slice(0, 6);
  const Icon = action === "edited" ? FilePenLine : PlusCircle;

  return (
    <section aria-label={title} className="rek-card overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <Icon size={18} className="text-primary" aria-hidden />
          <h2 className="text-lg font-black text-foreground">{title}</h2>
        </div>
        <Link
          href={`/dashboard/recent?action=${action}`}
          className="text-xs font-bold text-primary hover:underline"
        >
          View All
        </Link>
      </div>
      {list.length === 0 ? (
        <p className="px-5 py-8 text-sm text-muted-foreground">
          No {action} records yet.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {list.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex items-center gap-3 px-5 py-3 transition hover:bg-muted/50"
              >
                <Package size={16} className="shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">
                    {item.title}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {HISTORY_MODULE_LABELS[item.moduleKey] || item.moduleKey} ·{" "}
                    {relativeOpened(item.openedAt)}
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
