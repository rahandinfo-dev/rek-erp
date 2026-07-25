"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { pushUndoable } from "@/lib/undo/push";
import type { UndoModule } from "@/lib/undo/types";

type Options<T> = {
  module: UndoModule;
  value: T;
  setValue: (next: T) => void;
  enabled?: boolean;
  isEqual?: (a: T, b: T) => boolean;
  label?: string;
  debounceMs?: number;
};

/**
 * Local multi-level form history — works with Auto Save / Drafts.
 * Browser-native Ctrl+Z still applies inside text inputs.
 */
export function useFormHistory<T>({
  module,
  value,
  setValue,
  enabled = true,
  isEqual,
  label = "Form edit",
  debounceMs = 500,
}: Options<T>) {
  const prevRef = useRef<T>(value);
  const readyRef = useRef(false);
  const applyingRef = useRef(false);
  const [version, setVersion] = useState(0);

  // Callers pass inline `setValue` / `isEqual` closures. Depending on their
  // identity would restart the debounce timer on every parent render, which
  // both spams the undo stack and prevents any entry from ever being pushed.
  const setValueRef = useRef(setValue);
  const isEqualRef = useRef(isEqual);
  useEffect(() => {
    setValueRef.current = setValue;
    isEqualRef.current = isEqual;
  });

  const applyValue = useCallback((next: T) => setValueRef.current(next), []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      readyRef.current = true;
      prevRef.current = value;
    }, 50);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!enabled || !readyRef.current || applyingRef.current) {
      if (!applyingRef.current) prevRef.current = value;
      return;
    }

    const equal =
      isEqualRef.current?.(prevRef.current, value) ??
      JSON.stringify(prevRef.current) === JSON.stringify(value);
    if (equal) return;

    const previous = prevRef.current;
    const next = value;
    const timer = window.setTimeout(() => {
      if (applyingRef.current) return;
      pushUndoable({
        module,
        kind: "edit",
        label,
        title: label,
        showToast: false,
        skipAudit: true,
        undo: () => {
          applyingRef.current = true;
          applyValue(previous);
          prevRef.current = previous;
          setVersion((v) => v + 1);
          queueMicrotask(() => {
            applyingRef.current = false;
          });
        },
        redo: () => {
          applyingRef.current = true;
          applyValue(next);
          prevRef.current = next;
          setVersion((v) => v + 1);
          queueMicrotask(() => {
            applyingRef.current = false;
          });
        },
      });
      prevRef.current = next;
    }, debounceMs);

    return () => window.clearTimeout(timer);
  }, [value, enabled, module, label, applyValue, debounceMs]);

  const capture = useCallback(
    (from: T, to: T, actionLabel?: string) => {
      if (!enabled) return;
      pushUndoable({
        module,
        kind: "edit",
        label: actionLabel || label,
        title: actionLabel || label,
        undo: () => {
          applyingRef.current = true;
          applyValue(from);
          prevRef.current = from;
          queueMicrotask(() => {
            applyingRef.current = false;
          });
        },
        redo: () => {
          applyingRef.current = true;
          applyValue(to);
          prevRef.current = to;
          queueMicrotask(() => {
            applyingRef.current = false;
          });
        },
      });
      prevRef.current = to;
    },
    [enabled, module, label, applyValue]
  );

  return { version, capture };
}
