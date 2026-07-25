"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw, Undo2, X } from "lucide-react";
import { toast } from "sonner";

type Props = {
  id: string | number;
  title: string;
  message?: string;
  undoLabel?: string;
  durationMs: number;
  onUndo: () => void | Promise<void>;
};

/**
 * Enterprise undo toast — large touch target, progress countdown, mobile-friendly.
 */
export default function UndoToast({
  id,
  title,
  message,
  undoLabel = "Undo",
  durationMs,
  onUndo,
}: Props) {
  const initialSeconds = Math.max(1, Math.ceil(durationMs / 1000));
  const [remaining, setRemaining] = useState(initialSeconds);
  const [busy, setBusy] = useState(false);
  const undone = useRef(false);
  const start = useRef(0);

  useEffect(() => {
    undone.current = false;
    start.current = performance.now();
    const tick = window.setInterval(() => {
      const elapsed = performance.now() - start.current;
      const left = Math.max(0, Math.ceil((durationMs - elapsed) / 1000));
      setRemaining(left);
      if (left <= 0) window.clearInterval(tick);
    }, 250);
    return () => window.clearInterval(tick);
  }, [id, durationMs]);

  async function handleUndo() {
    if (undone.current || busy) return;
    undone.current = true;
    setBusy(true);
    try {
      await onUndo();
      toast.dismiss(id);
    } catch {
      undone.current = false;
      setBusy(false);
    }
  }

  return (
    <div
      className="rek-toast rek-toast-warning rek-toast-undo"
      role="status"
      aria-live="polite"
    >
      <div className="rek-toast-glow" aria-hidden />
      <div className="rek-toast-icon">
        <Undo2 size={20} strokeWidth={2.4} />
      </div>
      <div className="rek-toast-body">
        <p className="rek-toast-title">{title}</p>
        {message ? <p className="rek-toast-message">{message}</p> : null}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleUndo()}
            className="rek-toast-undo-btn inline-flex min-h-11 min-w-[5.5rem] items-center justify-center gap-1.5 rounded-xl bg-card px-4 py-2 text-sm font-black text-primary shadow-sm ring-1 ring-border transition hover:bg-secondary disabled:opacity-60"
          >
            <RotateCcw size={14} className={busy ? "animate-spin" : ""} />
            {busy ? "…" : undoLabel}
          </button>
          <span className="text-[11px] font-bold tabular-nums text-muted-foreground">
            {remaining}s
          </span>
        </div>
      </div>
      <button
        type="button"
        className="rek-toast-close"
        aria-label="Dismiss"
        onClick={() => toast.dismiss(id)}
      >
        <X size={16} />
      </button>
      <span
        className="rek-toast-progress rek-toast-progress-undo"
        style={{ animationDuration: `${durationMs}ms` }}
        aria-hidden
      />
    </div>
  );
}
