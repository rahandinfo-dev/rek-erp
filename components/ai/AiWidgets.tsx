"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { AiAlertView } from "@/lib/ai/types";

type Bundle = {
  alerts: AiAlertView[];
};

function useAiAlerts() {
  const [bundle, setBundle] = useState<Bundle | null>(null);
  useEffect(() => {
    let cancelled = false;
    const t = window.setTimeout(() => {
      void fetch("/api/ai/insights", { cache: "no-store" })
        .then((r) => r.json())
        .then((json) => {
          if (!cancelled && json.success) setBundle(json.data);
        })
        .catch(() => undefined);
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, []);
  return bundle;
}

function Shell({
  title,
  icon: Icon,
  children,
  empty,
}: {
  title: string;
  icon: typeof AlertTriangle;
  children: ReactNode;
  empty?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-black">
          <Icon size={16} className="text-primary" aria-hidden />
          {title}
        </h3>
        <Link
          href="/dashboard/ai-assistant"
          className="text-xs font-bold text-primary hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/35"
        >
          AI
        </Link>
      </div>
      {empty ? (
        <p className="text-xs text-muted-foreground">بارکردن…</p>
      ) : (
        children
      )}
    </div>
  );
}

export function ActiveAiAlertsWidget() {
  const bundle = useAiAlerts();
  const items = bundle?.alerts || [];
  return (
    <Shell title="Active Alerts" icon={AlertTriangle} empty={!bundle}>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">No open AI alerts.</p>
      ) : (
        <ul className="space-y-2">
          {items.slice(0, 5).map((a) => (
            <li
              key={a.id}
              className="rounded-xl border border-border/70 px-3 py-2 text-xs"
            >
              <p className="font-bold">{a.title}</p>
              <p className="text-muted-foreground">{a.message}</p>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}
