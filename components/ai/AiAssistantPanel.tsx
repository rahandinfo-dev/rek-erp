"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Bot, Loader2, Sparkles, X } from "lucide-react";
import {
  closeAiAssistant,
  subscribeAiAssistant,
} from "@/lib/ai/bus";
import {
  AI_PREDEFINED_QUESTIONS,
  type PredefinedAiIntent,
} from "@/lib/ai/predefined";
import type { AiChatResponse } from "@/lib/ai/types";
import { cn } from "@/lib/utils";

type AnswerLine = {
  id: string;
  question: string;
  response: AiChatResponse;
};

export default function AiAssistantPanel() {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<PredefinedAiIntent | null>(null);
  const [answers, setAnswers] = useState<AnswerLine[]>([]);
  const [error, setError] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const idSeq = useRef(0);

  function nextId() {
    idSeq.current += 1;
    return `a-${idSeq.current}`;
  }

  useEffect(() => subscribeAiAssistant(setOpen), []);

  useEffect(() => {
    function onOpen() {
      setOpen(true);
    }
    function onToggle() {
      setOpen((v) => !v);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
        closeAiAssistant();
      }
    }
    window.addEventListener("rek:ai-assistant-open", onOpen);
    window.addEventListener("rek:ai-assistant-toggle", onToggle);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("rek:ai-assistant-open", onOpen);
      window.removeEventListener("rek:ai-assistant-toggle", onToggle);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [answers, open]);

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
        setError(json.message || "هەڵەیەک ڕوویدا.");
        return;
      }
      setAnswers((prev) => [
        ...prev,
        {
          id: nextId(),
          question,
          response: json.data.response,
        },
      ]);
    } catch {
      setError("هەڵەی تۆڕ — دووبارە هەوڵ بدەرەوە.");
    } finally {
      setBusy(null);
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed end-3 bottom-3 z-[85] flex w-[min(100vw-1.5rem,380px)] flex-col overflow-hidden border border-border bg-card shadow-[var(--shadow-md)] sm:end-5 sm:bottom-5"
    >
      <div className="flex items-center justify-between gap-2 border-b border-border bg-primary/5 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <Sparkles size={18} className="text-primary" aria-hidden />
          <div className="min-w-0">
            <h2 id={titleId} className="truncate text-sm font-black">
              یاریدەدەری زیرەک
            </h2>
            <p className="truncate text-[11px] text-muted-foreground">
              تەنها داتای ڕاستەقینە · کوردی سۆرانی
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href="/dashboard/ai-assistant"
            className="px-2 py-1 text-[11px] font-bold text-primary hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/35"
            onClick={() => {
              setOpen(false);
              closeAiAssistant();
            }}
          >
            لاپەڕە
          </Link>
          <button
            type="button"
            className="p-1.5 hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/35"
            aria-label="داخستنی یاریدەدەری زیرەک"
            onClick={() => {
              setOpen(false);
              closeAiAssistant();
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="space-y-2 border-b border-border p-3">
        <p className="text-[11px] font-bold text-muted-foreground">
          پرسیارێک هەڵبژێرە
        </p>
        <div className="grid gap-1.5">
          {AI_PREDEFINED_QUESTIONS.map((q) => (
            <button
              key={q.id}
              type="button"
              disabled={Boolean(busy)}
              onClick={() => void ask(q.id, q.label)}
              className={cn(
                "flex items-center gap-2 border border-border bg-background px-2.5 py-2 text-start text-[11px] font-bold hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/35",
                busy === q.id && "opacity-70"
              )}
            >
              {busy === q.id ? (
                <Loader2 size={12} className="shrink-0 animate-spin" />
              ) : (
                <Bot size={12} className="shrink-0 text-primary" />
              )}
              <span>{q.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div
        ref={listRef}
        className="max-h-[min(45vh,360px)] space-y-2.5 overflow-y-auto px-3 py-3"
        aria-live="polite"
      >
        {answers.length === 0 && !error ? (
          <p className="text-xs text-muted-foreground">
            کارتی پرسیار بکەرەوە بۆ وەرگرتنی وەڵام لە داتابەیس.
          </p>
        ) : null}
        {error ? (
          <p className="border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        ) : null}
        {answers.map((line) => (
          <div
            key={line.id}
            className="space-y-2 border border-border bg-background px-3 py-2 text-sm"
          >
            <p className="text-[10px] font-bold text-muted-foreground">
              {line.question}
            </p>
            <p className="whitespace-pre-wrap text-xs">{line.response.reply}</p>
            {line.response.links?.length ? (
              <div className="flex flex-wrap gap-1.5">
                {line.response.links.map((l) => (
                  <Link
                    key={l.href + l.label}
                    href={l.href}
                    className="border border-border bg-card px-2 py-1 text-[11px] font-bold hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/35"
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
