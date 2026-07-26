"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import type {
  AiAlertView,
  AiInsightView,
  AiRecommendation,
  BusinessHealth,
} from "@/lib/ai/types";

type Bundle = {
  insights: AiInsightView[];
  alerts: AiAlertView[];
  recommendations: AiRecommendation[];
  health: BusinessHealth;
};

function useAiBundle() {
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
  icon: typeof Sparkles;
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
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : (
        children
      )}
    </div>
  );
}

export function AiInsightsWidget() {
  const bundle = useAiBundle();
  const items = bundle?.insights || [];
  return (
    <Shell title="AI Insights" icon={Sparkles} empty={!bundle}>
      <ul className="space-y-2">
        {items.slice(0, 5).map((i) => (
          <li
            key={i.id}
            className="rounded-xl border border-border/70 px-3 py-2 text-xs"
          >
            <p className="font-bold">{i.title}</p>
            <p className="text-muted-foreground">{i.summary}</p>
          </li>
        ))}
      </ul>
    </Shell>
  );
}

export function BusinessHealthWidget() {
  const bundle = useAiBundle();
  const health = bundle?.health;
  return (
    <Shell title="تەندروستی کار" icon={Activity} empty={!health}>
      {health ? (
        <div>
          <p className="text-2xl font-black tabular-nums">
            {health.score}{" "}
            <span className="text-sm font-bold text-muted-foreground">
              {health.label}
            </span>
          </p>
          <ul className="mt-2 space-y-1.5">
            {health.factors.slice(0, 4).map((f) => (
              <li
                key={f.key}
                className="flex justify-between gap-2 text-xs text-muted-foreground"
              >
                <span>{f.label}</span>
                <span className="font-bold tabular-nums text-foreground">
                  {Math.round(f.score)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Shell>
  );
}

export function SmartRecommendationsWidget() {
  const bundle = useAiBundle();
  const items = bundle?.recommendations || [];
  return (
    <Shell title="Smart Recommendations" icon={Lightbulb} empty={!bundle}>
      <ul className="space-y-2">
        {items.slice(0, 5).map((r) => (
          <li key={r.id}>
            <Link
              href={r.href}
              className="block rounded-xl border border-border/70 px-3 py-2 text-xs hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/35"
            >
              <span className="font-bold">{r.title}</span>
              <span className="mt-0.5 block text-muted-foreground">
                {r.reason}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Shell>
  );
}

export function ActiveAiAlertsWidget() {
  const bundle = useAiBundle();
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
