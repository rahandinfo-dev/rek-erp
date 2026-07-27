"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Copy, Delete, Equal, History, X } from "lucide-react";
import { appToast } from "@/lib/toast";
import { useFormDraft } from "@/lib/hooks/useFormDraft";
import { DRAFT_KEYS } from "@/lib/drafts/types";
import { AutoSaveStatus } from "@/components/ui/AutoSaveStatus";
import { tServer } from "@/lib/i18n";

type Op = "+" | "-" | "*" | "/" | null;

type CalcDraft = {
  display: string;
  acc: number | null;
  op: Op;
  fresh: boolean;
  memory: number;
  history: string[];
};

function formatDisplay(n: number) {
  if (!Number.isFinite(n)) return tServer.t("calculator.error");
  const rounded = Math.round((n + Number.EPSILON) * 1e10) / 1e10;
  return String(rounded);
}

function applyCalcDraft(
  data: CalcDraft,
  setters: {
    setDisplay: (v: string) => void;
    setAcc: (v: number | null) => void;
    setOp: (v: Op) => void;
    setFresh: (v: boolean) => void;
    setMemory: (v: number) => void;
    setHistory: (v: string[]) => void;
  }
) {
  setters.setDisplay(data.display || "0");
  setters.setAcc(data.acc ?? null);
  setters.setOp(data.op ?? null);
  setters.setFresh(data.fresh ?? true);
  setters.setMemory(Number(data.memory) || 0);
  setters.setHistory(Array.isArray(data.history) ? data.history : []);
}

export default function CalculatorApp() {
  const [display, setDisplay] = useState("0");
  const [acc, setAcc] = useState<number | null>(null);
  const [op, setOp] = useState<Op>(null);
  const [fresh, setFresh] = useState(true);
  const [memory, setMemory] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const restoredRef = useRef(false);

  const draftValue = useMemo<CalcDraft>(
    () => ({ display, acc, op, fresh, memory, history }),
    [display, acc, op, fresh, memory, history]
  );

  const {
    status: draftStatus,
    savedAt: draftSavedAt,
    ready,
    hasPendingDraft,
    restoreDraft,
    discardDraft,
  } = useFormDraft({
    key: DRAFT_KEYS.calculator,
    value: draftValue,
    isEmpty: (v) =>
      v.display === "0" &&
      v.acc == null &&
      v.op == null &&
      v.memory === 0 &&
      v.history.length === 0,
  });

  // Hydrate calculator memory/history from draft storage once ready.
  useEffect(() => {
    if (!ready || restoredRef.current) return;
    restoredRef.current = true;
    if (!hasPendingDraft) return;
    const data = restoreDraft();
    if (!data) {
      discardDraft();
      return;
    }
    // Defer apply so draft pending clears before value writes resume autosave.
    queueMicrotask(() => {
      applyCalcDraft(data, {
        setDisplay,
        setAcc,
        setOp,
        setFresh,
        setMemory,
        setHistory,
      });
    });
  }, [ready, hasPendingDraft, restoreDraft, discardDraft]);

  const pushHistory = useCallback((line: string) => {
    setHistory((prev) => [line, ...prev].slice(0, 12));
  }, []);

  const inputDigit = useCallback(
    (d: string) => {
      setDisplay((prev) => {
        if (fresh || prev === "0") {
          setFresh(false);
          return d;
        }
        if (prev.length >= 16) return prev;
        return prev + d;
      });
    },
    [fresh]
  );

  const inputDot = useCallback(() => {
    setDisplay((prev) => {
      if (fresh) {
        setFresh(false);
        return "0.";
      }
      if (prev.includes(".")) return prev;
      return `${prev}.`;
    });
  }, [fresh]);

  const clearAll = useCallback(() => {
    setDisplay("0");
    setAcc(null);
    setOp(null);
    setFresh(true);
  }, []);

  const applyOp = useCallback(
    (next: Op) => {
      const current = Number(display);
      if (acc == null || op == null || fresh) {
        setAcc(current);
        setOp(next);
        setFresh(true);
        return;
      }
      const result = compute(acc, current, op);
      pushHistory(`${formatDisplay(acc)} ${op} ${formatDisplay(current)} = ${formatDisplay(result)}`);
      setAcc(result);
      setDisplay(formatDisplay(result));
      setOp(next);
      setFresh(true);
    },
    [acc, display, fresh, op, pushHistory]
  );

  const equals = useCallback(() => {
    if (acc == null || op == null) return;
    const current = Number(display);
    const result = compute(acc, current, op);
    pushHistory(
      `${formatDisplay(acc)} ${op} ${formatDisplay(current)} = ${formatDisplay(result)}`
    );
    setDisplay(formatDisplay(result));
    setAcc(null);
    setOp(null);
    setFresh(true);
  }, [acc, display, op, pushHistory]);

  const percent = useCallback(() => {
    const current = Number(display);
    const result = current / 100;
    setDisplay(formatDisplay(result));
    setFresh(true);
  }, [display]);

  const backspace = useCallback(() => {
    setDisplay((prev) => {
      if (fresh) return prev;
      if (prev.length <= 1) return "0";
      return prev.slice(0, -1);
    });
  }, [fresh]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        inputDigit(e.key);
      } else if (e.key === ".") {
        e.preventDefault();
        inputDot();
      } else if (e.key === "+" || e.key === "-" || e.key === "*" || e.key === "/") {
        e.preventDefault();
        applyOp(e.key);
      } else if (e.key === "Enter" || e.key === "=") {
        e.preventDefault();
        equals();
      } else if (e.key === "Escape") {
        e.preventDefault();
        clearAll();
      } else if (e.key === "Backspace") {
        e.preventDefault();
        backspace();
      } else if (e.key === "%") {
        e.preventDefault();
        percent();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [applyOp, backspace, clearAll, equals, inputDigit, inputDot, percent]);

  async function copyResult() {
    try {
      await navigator.clipboard.writeText(display);
      appToast.success("ئەنجام کۆپی کرا.");
    } catch {
      appToast.error("کۆپی سەرنەکەوت.");
    }
  }

  const keys: Array<{
    label: string;
    onClick: () => void;
    className?: string;
    span?: boolean;
  }> = [
    { label: "C", onClick: clearAll, className: "bg-muted text-foreground" },
    {
      label: "⌫",
      onClick: backspace,
      className: "bg-muted text-foreground",
    },
    { label: "%", onClick: percent, className: "bg-muted text-foreground" },
    {
      label: "÷",
      onClick: () => applyOp("/"),
      className: "bg-primary/15 text-primary",
    },
    { label: "7", onClick: () => inputDigit("7") },
    { label: "8", onClick: () => inputDigit("8") },
    { label: "9", onClick: () => inputDigit("9") },
    {
      label: "×",
      onClick: () => applyOp("*"),
      className: "bg-primary/15 text-primary",
    },
    { label: "4", onClick: () => inputDigit("4") },
    { label: "5", onClick: () => inputDigit("5") },
    { label: "6", onClick: () => inputDigit("6") },
    {
      label: "−",
      onClick: () => applyOp("-"),
      className: "bg-primary/15 text-primary",
    },
    { label: "1", onClick: () => inputDigit("1") },
    { label: "2", onClick: () => inputDigit("2") },
    { label: "3", onClick: () => inputDigit("3") },
    {
      label: "+",
      onClick: () => applyOp("+"),
      className: "bg-primary/15 text-primary",
    },
    {
      label: "0",
      onClick: () => inputDigit("0"),
      span: true,
    },
    { label: ".", onClick: inputDot },
    {
      label: "=",
      onClick: equals,
      className: "bg-primary text-primary-foreground",
    },
  ];

  return (
    <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-[1fr_280px]">
      <div className="rek-card overflow-hidden p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-black text-primary sm:text-3xl">
              ژمێرەر
            </h1>
            <p className="text-sm text-muted-foreground">
              خێرا · کیبۆرد · مێمۆری
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <AutoSaveStatus status={draftStatus} savedAt={draftSavedAt} />
            <button
              type="button"
              onClick={() => void copyResult()}
              className="inline-flex size-10 items-center justify-center rounded-xl border border-border"
              title="کۆپی"
            >
              <Copy size={16} />
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex size-10 items-center justify-center rounded-xl border border-border"
              title="پاککردنەوە"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="mb-3 rounded-2xl bg-muted/60 px-4 py-5 text-left" dir="ltr">
          <p className="text-xs font-bold text-muted-foreground">
            {acc != null && op ? `${formatDisplay(acc)} ${op}` : "\u00a0"}
          </p>
          <p className="mt-1 truncate text-4xl font-black tabular-nums text-foreground sm:text-5xl">
            {display}
          </p>
        </div>

        <div className="mb-4 flex flex-wrap gap-2" dir="ltr">
          <MemBtn
            label="MC"
            onClick={() => setMemory(0)}
          />
          <MemBtn
            label="MR"
            onClick={() => {
              setDisplay(formatDisplay(memory));
              setFresh(true);
            }}
          />
          <MemBtn
            label="M+"
            onClick={() => setMemory((m) => m + Number(display))}
          />
          <MemBtn
            label="M−"
            onClick={() => setMemory((m) => m - Number(display))}
          />
          <span className="ms-auto self-center text-xs font-bold text-muted-foreground">
            M: {formatDisplay(memory)}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2" dir="ltr">
          {keys.map((k) => (
            <button
              key={k.label}
              type="button"
              onClick={k.onClick}
              className={`h-14 rounded-2xl text-lg font-bold transition hover:brightness-95 active:scale-[0.98] ${
                k.span ? "col-span-2" : ""
              } ${k.className || "bg-card border border-border text-foreground"}`}
            >
              {k.label === "⌫" ? <Delete size={18} className="mx-auto" /> : k.label}
              {k.label === "=" ? (
                <Equal size={18} className="mx-auto hidden" />
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <aside className="rek-card p-4">
        <div className="mb-3 flex items-center gap-2 font-bold text-primary">
          <History size={16} />
          مێژوو
        </div>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">هێشتا حیساب نییە.</p>
        ) : (
          <ul className="space-y-2" dir="ltr">
            {history.map((line, i) => (
              <li
                key={`${line}-${i}`}
                className="rounded-xl bg-muted/50 px-3 py-2 text-sm font-semibold tabular-nums"
              >
                {line}
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}

function MemBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-bold"
    >
      {label}
    </button>
  );
}

function compute(a: number, b: number, op: Op) {
  switch (op) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "*":
      return a * b;
    case "/":
      return b === 0 ? NaN : a / b;
    default:
      return b;
  }
}
