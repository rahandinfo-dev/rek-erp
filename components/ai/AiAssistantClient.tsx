"use client";
import { formatDateTime } from "@/lib/utils/datetime";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Bot,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import { openAiAssistant } from "@/lib/ai/bus";
import { AI_SUGGESTED_PROMPTS } from "@/lib/ai/types";
import type {
  AiAlertView,
  AiInsightView,
  AiRecommendation,
  BusinessHealth,
} from "@/lib/ai/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Bundle = {
  insights: AiInsightView[];
  alerts: AiAlertView[];
  recommendations: AiRecommendation[];
  health: BusinessHealth;
  nextActions: Array<{ title: string; href: string; reason: string }>;
};

export default function AiAssistantClient() {
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [rules, setRules] = useState<
    Array<{
      id: string;
      name: string;
      kind: string;
      schedule: string;
      enabled: boolean;
      lastRunAt: string | null;
    }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void Promise.all([
        fetch("/api/ai/insights?refresh=1", { cache: "no-store" }).then((r) =>
          r.json()
        ),
        fetch("/api/ai/automations?run=1", { cache: "no-store" }).then((r) =>
          r.json()
        ),
      ])
        .then(([insightsJson, autoJson]) => {
          if (insightsJson.success) setBundle(insightsJson.data);
          if (autoJson.success) setRules(autoJson.data.rules || []);
        })
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  async function toggleRule(id: string, enabled: boolean) {
    const res = await fetch("/api/ai/automations", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, enabled }),
    });
    const json = await res.json();
    if (json.success) {
      setRules((prev) =>
        prev.map((r) => (r.id === id ? { ...r, enabled } : r))
      );
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-black text-primary">
            <Sparkles aria-hidden />
            یاریدەدەری زیرەک
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            وەڵام تەنها لەسەر داتای ڕاستەقینەی کۆمپانیاکەت — هیچ ژمارەیەکی خەیاڵی
            یان خەملێنراو نییە.
          </p>
        </div>
        <Button type="button" onClick={() => openAiAssistant()}>
          <Bot size={16} aria-hidden />
          کردنەوەی گفتوگۆ
        </Button>
      </header>

      <div className="flex flex-wrap gap-2">
        {AI_SUGGESTED_PROMPTS.slice(0, 8).map((p) => (
          <button
            key={p}
            type="button"
            className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-bold hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/35"
            onClick={() => openAiAssistant()}
          >
            {p}
          </button>
        ))}
      </div>

      {loading || !bundle ? (
        <p className="text-sm text-muted-foreground">Loading AI insights…</p>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <section className="rek-card space-y-3 p-4">
            <h2 className="flex items-center gap-2 text-sm font-black">
              <Activity size={16} className="text-primary" aria-hidden />
              Business Health
            </h2>
            <p className="text-3xl font-black tabular-nums">
              {bundle.health.score}
              <span className="ms-2 text-base font-bold text-muted-foreground">
                {bundle.health.label}
              </span>
            </p>
            <ul className="space-y-2">
              {bundle.health.factors.map((f) => (
                <li
                  key={f.key}
                  className="flex items-center justify-between gap-2 rounded-xl border border-border/70 px-3 py-2 text-xs"
                >
                  <span>
                    <span className="font-bold">{f.label}</span>
                    <span className="mt-0.5 block text-muted-foreground">
                      {f.note}
                    </span>
                  </span>
                  <span className="font-black tabular-nums">
                    {Math.round(f.score)}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rek-card space-y-3 p-4">
            <h2 className="flex items-center gap-2 text-sm font-black">
              <AlertTriangle size={16} className="text-primary" aria-hidden />
              Active Alerts
            </h2>
            {bundle.alerts.length === 0 ? (
              <p className="text-xs text-muted-foreground">No open alerts.</p>
            ) : (
              <ul className="space-y-2">
                {bundle.alerts.map((a) => (
                  <li
                    key={a.id}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-xs",
                      a.severity === "critical" && "border-destructive/40 bg-destructive/5",
                      a.severity === "warning" && "border-amber-300/50 bg-amber-50/50",
                      a.severity === "info" && "border-border"
                    )}
                  >
                    <p className="font-bold">{a.title}</p>
                    <p className="text-muted-foreground">{a.message}</p>
                    {a.href ? (
                      <Link
                        href={a.href}
                        className="mt-1 inline-block font-bold text-primary hover:underline"
                      >
                        Open
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rek-card space-y-3 p-4">
            <h2 className="flex items-center gap-2 text-sm font-black">
              <Sparkles size={16} className="text-primary" aria-hidden />
              AI Insights
            </h2>
            <ul className="space-y-2">
              {bundle.insights.slice(0, 8).map((i) => (
                <li
                  key={i.id}
                  className="rounded-xl border border-border/70 px-3 py-2 text-xs"
                >
                  <p className="font-bold">{i.title}</p>
                  <p className="text-muted-foreground">{i.summary}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="rek-card space-y-3 p-4">
            <h2 className="flex items-center gap-2 text-sm font-black">
              <Lightbulb size={16} className="text-primary" aria-hidden />
              Smart Recommendations
            </h2>
            <ul className="space-y-2">
              {bundle.recommendations.slice(0, 8).map((r) => (
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
          </section>
        </div>
      )}

      <section className="rek-card space-y-3 p-4">
        <h2 className="text-sm font-black">Suggested next actions</h2>
        <div className="flex flex-wrap gap-2">
          {(bundle?.nextActions || []).map((a) => (
            <Link
              key={a.title + a.href}
              href={a.href}
              className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/35"
              title={a.reason}
            >
              {a.title}
            </Link>
          ))}
        </div>
      </section>

      <section className="rek-card space-y-3 p-4">
        <h2 className="text-sm font-black">Workflow automation</h2>
        <ul className="space-y-2">
          {rules.map((rule) => (
            <li
              key={rule.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 px-3 py-2 text-xs"
            >
              <div>
                <p className="font-bold">{rule.name}</p>
                <p className="text-muted-foreground">
                  {rule.kind} · {rule.schedule}
                  {rule.lastRunAt
                    ? ` · last ${formatDateTime(rule.lastRunAt, true)}`
                    : ""}
                </p>
              </div>
              <label className="inline-flex items-center gap-2 font-bold">
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={(e) => void toggleRule(rule.id, e.target.checked)}
                  className="focus-visible:ring-[3px] focus-visible:ring-ring/35"
                />
                Enabled
              </label>
            </li>
          ))}
        </ul>
      </section>

    </div>
  );
}
