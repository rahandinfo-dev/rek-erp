"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Bot, Send, Sparkles, X } from "lucide-react";
import {
  closeAiAssistant,
  subscribeAiAssistant,
} from "@/lib/ai/bus";
import { AI_SUGGESTED_PROMPTS, AI_WELCOME_KU } from "@/lib/ai/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type ChatLine = {
  id: string;
  role: "user" | "assistant";
  content: string;
  links?: Array<{ label: string; href: string }>;
  suggestions?: string[];
};

export default function AiAssistantPanel() {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [lines, setLines] = useState<ChatLine[]>([
    {
      id: "welcome",
      role: "assistant",
      content: AI_WELCOME_KU,
      suggestions: AI_SUGGESTED_PROMPTS.slice(0, 6),
    },
  ]);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const idSeq = useRef(0);
  function nextLineId(prefix: string) {
    idSeq.current += 1;
    return `${prefix}-${idSeq.current}`;
  }

  useEffect(() => {
    return subscribeAiAssistant(setOpen);
  }, []);

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
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open || hydrated) return;
    let cancelled = false;
    void fetch("/api/ai/chat", { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        if (cancelled || !json.success || !Array.isArray(json.data?.messages)) {
          return;
        }
        const history: ChatLine[] = json.data.messages.map(
          (m: {
            id: string;
            role: string;
            content: string;
            metadata?: {
              links?: Array<{ label: string; href: string }>;
              suggestions?: string[];
            };
          }) => ({
            id: m.id,
            role: m.role === "user" ? "user" : "assistant",
            content: m.content,
            links: m.metadata?.links,
            suggestions: m.metadata?.suggestions,
          })
        );
        if (history.length) {
          setLines([
            {
              id: "welcome",
              role: "assistant",
              content: AI_WELCOME_KU,
              suggestions: AI_SUGGESTED_PROMPTS.slice(0, 4),
            },
            ...history,
          ]);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open, hydrated]);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [lines, open]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setInput("");
    setBusy(true);
    const userLine: ChatLine = {
      id: nextLineId("u"),
      role: "user",
      content: message,
    };
    setLines((prev) => [...prev, userLine]);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const json = await res.json();
      if (!json.success) {
        setLines((prev) => [
          ...prev,
          {
            id: nextLineId("e"),
            role: "assistant",
            content: json.message || "هەڵەیەک ڕوویدا. دووبارە هەوڵ بدەرەوە.",
          },
        ]);
        return;
      }
      const r = json.data.response;
      setLines((prev) => [
        ...prev,
        {
          id: json.data.assistantMessageId || nextLineId("a"),
          role: "assistant",
          content: r.reply,
          links: r.links,
          suggestions: r.suggestions,
        },
      ]);
    } catch {
      setLines((prev) => [
        ...prev,
        {
          id: nextLineId("e"),
          role: "assistant",
          content: "هەڵەی تۆڕ — دووبارە هەوڵ بدەرەوە.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed end-3 bottom-3 z-[85] flex w-[min(100vw-1.5rem,380px)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-md)] sm:end-5 sm:bottom-5"
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
            className="rounded-lg px-2 py-1 text-[11px] font-bold text-primary hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/35"
            onClick={() => {
              setOpen(false);
              closeAiAssistant();
            }}
          >
            لاپەڕە
          </Link>
          <button
            type="button"
            className="rounded-lg p-1.5 hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/35"
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

      <div
        ref={listRef}
        className="max-h-[min(55vh,420px)] space-y-2.5 overflow-y-auto px-3 py-3"
        aria-live="polite"
      >
        {lines.map((line) => (
          <div
            key={line.id}
            className={cn(
              "rounded-xl px-3 py-2 text-sm",
              line.role === "user"
                ? "ms-8 bg-primary text-primary-foreground"
                : "me-4 border border-border bg-background"
            )}
          >
            {line.role === "assistant" ? (
              <p className="mb-1 flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
                <Bot size={12} aria-hidden /> یاریدەدەر
              </p>
            ) : null}
            <p className="whitespace-pre-wrap">{line.content}</p>
            {line.links?.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {line.links.map((l) => (
                  <Link
                    key={l.href + l.label}
                    href={l.href}
                    className="rounded-lg border border-border bg-card px-2 py-1 text-[11px] font-bold hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/35"
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            ) : null}
            {line.suggestions?.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {line.suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="rounded-full border border-border px-2 py-0.5 text-[11px] font-semibold hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/35"
                    onClick={() => void send(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <form
        className="flex items-center gap-2 border-t border-border p-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <label className="sr-only" htmlFor="rek-ai-input">
          پرسیار لە یاریدەدەری زیرەک
        </label>
        <input
          id="rek-ai-input"
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="پرسیارێک بنووسە…"
          disabled={busy}
          className="h-10 flex-1 rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35"
        />
        <Button
          type="submit"
          size="sm"
          disabled={busy || !input.trim()}
          aria-label="ناردن"
        >
          <Send size={16} aria-hidden />
        </Button>
      </form>
    </div>
  );
}
