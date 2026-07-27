"use client";

import { useState } from "react";
import Link from "next/link";
import { Bot, Loader2, Sparkles } from "lucide-react";
import {
  AI_PREDEFINED_QUESTIONS,
  type PredefinedAiIntent,
} from "@/lib/ai/predefined";
import type { AiChatResponse } from "@/lib/ai/types";
import { cn } from "@/lib/utils";

type AnswerState = {
  intent: PredefinedAiIntent;
  question: string;
  response: AiChatResponse;
} | null;

export default function AiAssistantClient() {
  const [busy, setBusy] = useState<PredefinedAiIntent | null>(null);
  const [answer, setAnswer] = useState<AnswerState>(null);
  const [error, setError] = useState("");

  async function ask(intent: PredefinedAiIntent, question: string) {
    if (busy) return;
    setBusy(intent);
    setError("");
    try {
      const res = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ intent }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.message || "هەڵەیەک ڕوویدا. دووبارە هەوڵ بدەرەوە.");
        return;
      }
      setAnswer({
        intent,
        question,
        response: json.data.response,
      });
    } catch {
      setError("هەڵەی تۆڕ — دووبارە هەوڵ بدەرەوە.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-3xl font-black text-primary">
          <Sparkles aria-hidden />
          یاریدەدەری زیرەک
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          پرسیارێک هەڵبژێرە — وەڵام تەنها لە داتای ڕاستەقینەی کۆمپانیاکەت
          دەخوێنرێتەوە. هیچ ژمارەیەکی خەیاڵی یان خەملێنراو دروست ناکرێت.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {AI_PREDEFINED_QUESTIONS.map((q) => (
          <button
            key={q.id}
            type="button"
            disabled={Boolean(busy)}
            onClick={() => void ask(q.id, q.label)}
            className={cn(
              "rek-card flex min-h-[5.5rem] items-start gap-3 p-4 text-start transition hover:border-primary/40 focus-visible:ring-[3px] focus-visible:ring-ring/35",
              answer?.intent === q.id && "border-primary/50 bg-primary/5",
              busy === q.id && "opacity-80"
            )}
          >
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center bg-primary/10 text-primary">
              {busy === q.id ? (
                <Loader2 size={18} className="animate-spin" aria-hidden />
              ) : (
                <Bot size={18} aria-hidden />
              )}
            </span>
            <span className="text-sm font-bold leading-relaxed">{q.label}</span>
          </button>
        ))}
      </div>

      {error ? (
        <p className="border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {answer ? (
        <section
          className="rek-card space-y-3 p-5"
          aria-live="polite"
          aria-atomic="true"
        >
          <p className="text-xs font-bold text-muted-foreground">پرسیار</p>
          <p className="text-sm font-black">{answer.question}</p>
          <p className="text-xs font-bold text-muted-foreground">وەڵام</p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {answer.response.reply}
          </p>
          {answer.response.links?.length ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {answer.response.links.map((l) => (
                <Link
                  key={l.href + l.label}
                  href={l.href}
                  className="inline-flex h-8 items-center border border-border bg-background px-3 text-xs font-bold hover:bg-muted"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          ) : null}
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">
          یەکێک لە کارتی سەرەوە بکەرەوە بۆ وەرگرتنی وەڵامی داتای ڕاستەقینە.
        </p>
      )}
    </div>
  );
}
