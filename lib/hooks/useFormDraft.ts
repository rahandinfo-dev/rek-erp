"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { useOnlineStatus } from "@/lib/hooks/useBrowserStore";
import {
  clearDraft as clearDraftStorage,
  deleteServerDraft,
  fetchServerDraft,
  readDraft,
  syncDraftToServer,
  writeDraft,
} from "@/lib/drafts/storage";
import { useDraftOwner } from "@/lib/drafts/owner";
import type { AutoSaveStatus, DraftRecord } from "@/lib/drafts/types";
import {
  deviceLabel,
  estimateProgress,
  moduleFromDraftKey,
} from "@/lib/drafts/centerMeta";
import { useSaveGuard } from "@/lib/unsaved/provider";
import { buildChangeSummary } from "@/lib/unsaved/changeSummary";
import { mapDraftStatusToDirty, RETRY_DELAYS_MS } from "@/lib/unsaved/types";

type Options<T> = {
  /** Stable draft key, e.g. sale:new */
  key: string;
  /** Current form values to persist */
  value: T;
  enabled?: boolean;
  debounceMs?: number;
  /** Skip saving / treat as empty (no beforeunload) */
  isEmpty?: (value: T) => boolean;
  /** Also mirror draft to server when online */
  syncServer?: boolean;
  /** Human label for save guard / header */
  label?: string;
  moduleKey?: string;
  /** Baseline values for change summary (defaults to first non-empty snapshot) */
  baseline?: T | null;
};

export function useFormDraft<T>({
  key,
  value,
  enabled = true,
  debounceMs,
  isEmpty,
  syncServer = true,
  label,
  moduleKey,
  baseline = null,
}: Options<T>) {
  const { userId, companyId } = useDraftOwner();
  const saveGuard = useSaveGuard();
  const resolvedDebounce =
    debounceMs ??
    (saveGuard.prefs.autoSaveEnabled
      ? Math.min(saveGuard.prefs.autoSaveDelayMs, 5000)
      : 650);

  const [status, setStatus] = useState<AutoSaveStatus>("idle");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [pending, setPending] = useState<DraftRecord<T> | null>(null);
  const [ready, setReady] = useState(false);
  const lastSavedJson = useRef("");
  const valueRef = useRef(value);
  const writingRef = useRef(false);
  const baselineRef = useRef<T | null>(baseline);
  const retryCountRef = useRef(0);
  const sourceId = `draft:${key}`;

  // Callers almost always pass an inline `isEmpty`. Depending on that identity
  // directly would re-run every effect below on every parent render, so keep a
  // stable wrapper over the latest one.
  const isEmptyRef = useRef(isEmpty);
  useEffect(() => {
    isEmptyRef.current = isEmpty;
  }, [isEmpty]);
  const isValueEmpty = useCallback(
    (data: T) => isEmptyRef.current?.(data) ?? false,
    []
  );

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    if (baseline) baselineRef.current = baseline;
  }, [baseline]);

  // Load local (+ optional server) draft on mount
  useEffect(() => {
    let cancelled = false;
    const id = window.setTimeout(async () => {
      if (!enabled || !userId) {
        if (!cancelled) setReady(true);
        return;
      }

      let record = readDraft<T>(userId, key);

      if (syncServer) {
        try {
          const remote = await fetchServerDraft<T>(key);
          if (
            remote &&
            remote.userId === userId &&
            (!record || remote.savedAt > record.savedAt)
          ) {
            writeDraft(userId, companyId, key, remote.data);
            record = readDraft<T>(userId, key) || remote;
          }
        } catch {
          /* local-only fallback */
        }
      }

      if (!cancelled) {
        if (record && !isValueEmpty(record.data)) {
          setPending(record);
          setSavedAt(record.savedAt);
          if (!baselineRef.current) baselineRef.current = record.data;
        }
        setReady(true);
      }
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once per key/user
  }, [key, enabled, userId, companyId, syncServer]);

  const debounced = useDebouncedValue(value, resolvedDebounce);
  const canAutosave =
    enabled &&
    ready &&
    !pending &&
    Boolean(userId) &&
    saveGuard.prefs.autoSaveEnabled;
  // Assume online for the server render and the hydration render; the real
  // value is read after mount so the markup cannot diverge.
  const online = useOnlineStatus();

  const reportConflictRef = useRef(saveGuard.reportConflict);
  const registerRef = useRef(saveGuard.register);
  const unregisterRef = useRef(saveGuard.unregister);
  const updateRef = useRef(saveGuard.update);

  // Depend on the individual callbacks, not the whole context object: the
  // context value changes on every keystroke in any registered form.
  useEffect(() => {
    reportConflictRef.current = saveGuard.reportConflict;
    registerRef.current = saveGuard.register;
    unregisterRef.current = saveGuard.unregister;
    updateRef.current = saveGuard.update;
  }, [
    saveGuard.reportConflict,
    saveGuard.register,
    saveGuard.unregister,
    saveGuard.update,
  ]);

  const persist = useCallback(
    async (data: T, opts?: { sync?: boolean }): Promise<boolean> => {
      if (!userId || writingRef.current) return false;
      if (isValueEmpty(data)) {
        clearDraftStorage(userId, key);
        if (opts?.sync !== false && syncServer) {
          void deleteServerDraft(key);
        }
        lastSavedJson.current = "";
        setSavedAt(null);
        setStatus("idle");
        return true;
      }

      writingRef.current = true;
      const started = Date.now();
      try {
        const isOnline =
          typeof navigator === "undefined" ? true : navigator.onLine;
        const record = writeDraft(userId, companyId, key, data, {
          title: label,
          moduleKey: moduleKey || moduleFromDraftKey(key),
          device: deviceLabel(),
          progress: estimateProgress(data),
          status: isOnline ? "saved" : "draft",
        });
        lastSavedJson.current = JSON.stringify(data);
        setSavedAt(record.savedAt);
        if (!baselineRef.current) baselineRef.current = data;

        if (!isOnline) {
          setStatus("offline");
          retryCountRef.current = 0;
          return true;
        }

        if (opts?.sync !== false && syncServer) {
          const result = await syncDraftToServer({
            key,
            data,
            savedAt: record.savedAt,
            expiresAt: record.expiresAt,
            baseSavedAt: savedAt || undefined,
            meta: record.meta,
          });
          if (result.conflict && result.theirs) {
            reportConflictRef.current({
              sourceId,
              label: label || key,
              mine: data,
              theirs: result.theirs.data,
              mineSavedAt: record.savedAt,
              theirsSavedAt: result.theirs.savedAt,
            });
            setStatus("failed");
            return false;
          }
          if (result.ok) {
            setStatus("saved");
            retryCountRef.current = 0;
            void started;
            return true;
          }
          setStatus("waiting");
          return false;
        }
        setStatus("saved");
        retryCountRef.current = 0;
        return true;
      } catch {
        try {
          writeDraft(userId, companyId, key, data);
          setStatus(navigator.onLine ? "failed" : "offline");
        } catch {
          setStatus("failed");
        }
        return false;
      } finally {
        writingRef.current = false;
      }
    },
    [
      userId,
      companyId,
      key,
      isValueEmpty,
      syncServer,
      savedAt,
      sourceId,
      label,
      moduleKey,
    ]
  );

  const persistRef = useRef(persist);
  useEffect(() => {
    persistRef.current = persist;
  }, [persist]);

  // Register with save guard
  useEffect(() => {
    if (!enabled || !userId) return;
    registerRef.current({
      id: sourceId,
      label: label || key,
      moduleKey,
      pathname:
        typeof window !== "undefined" ? window.location.pathname : undefined,
      save: async () => persistRef.current(valueRef.current),
      discard: () => {
        clearDraftStorage(userId, key);
        void deleteServerDraft(key);
        setPending(null);
        lastSavedJson.current = "";
        setStatus("idle");
        setSavedAt(null);
      },
      snapshot: valueRef.current,
    });
    return () => unregisterRef.current(sourceId);
  }, [enabled, userId, key, sourceId, label, moduleKey]);

  // Sync dirty state to header
  useEffect(() => {
    if (!enabled) return;
    let hasDiff = false;
    try {
      const json = JSON.stringify(value);
      hasDiff =
        Boolean(json) &&
        json !== lastSavedJson.current &&
        !isValueEmpty(value);
    } catch {
      hasDiff = false;
    }
    const summary =
      baselineRef.current != null
        ? buildChangeSummary(baselineRef.current, value)
        : hasDiff
          ? ["Content Modified"]
          : [];
    updateRef.current(sourceId, {
      state: mapDraftStatusToDirty(status, hasDiff),
      savedAt,
      changeSummary: summary,
      snapshot: value,
    });
  }, [status, savedAt, value, enabled, sourceId, isValueEmpty]);

  // Restore discarded snapshot
  useEffect(() => {
    function onRestore(ev: Event) {
      const detail = (ev as CustomEvent).detail as {
        sourceId?: string;
        snapshot?: T;
      };
      if (detail?.sourceId !== sourceId || detail.snapshot == null) return;
      setPending({
        version: 2,
        key,
        userId: userId || "",
        companyId: companyId || "",
        savedAt: Date.now(),
        expiresAt: Date.now() + 30_000,
        data: detail.snapshot,
      });
      setStatus("restored");
    }
    function onConflict(ev: Event) {
      const detail = (ev as CustomEvent).detail as {
        sourceId?: string;
        choice?: string;
        data?: T;
      };
      if (detail?.sourceId !== sourceId) return;
      if (
        (detail.choice === "theirs" || detail.choice === "merge") &&
        detail.data != null
      ) {
        setPending({
          version: 2,
          key,
          userId: userId || "",
          companyId: companyId || "",
          savedAt: Date.now(),
          expiresAt: Date.now() + DRAFT_TTL_FALLBACK,
          data: detail.data,
        });
        void persist(detail.data);
      } else if (detail.choice === "mine") {
        void persist(valueRef.current, { sync: true });
      }
    }
    window.addEventListener("rek:restore-discard", onRestore);
    window.addEventListener("rek:conflict-resolve", onConflict);
    return () => {
      window.removeEventListener("rek:restore-discard", onRestore);
      window.removeEventListener("rek:conflict-resolve", onConflict);
    };
  }, [sourceId, key, userId, companyId, persist]);

  // Immediate "Unsaved changes" while typing (before debounce)
  useEffect(() => {
    if (!enabled || !ready || pending) return;
    if (isValueEmpty(value)) return;
    let json = "";
    try {
      json = JSON.stringify(value);
    } catch {
      return;
    }
    if (json !== lastSavedJson.current && status !== "saving") {
      const id = window.setTimeout(() => setStatus("unsaved"), 0);
      return () => window.clearTimeout(id);
    }
  }, [value, enabled, ready, pending, isValueEmpty, status]);

  // Debounced autosave
  useEffect(() => {
    if (!canAutosave) return;

    let json: string;
    try {
      json = JSON.stringify(debounced);
    } catch {
      const failId = window.setTimeout(() => setStatus("failed"), 0);
      return () => window.clearTimeout(failId);
    }

    if (json === lastSavedJson.current) return;

    const savingId = window.setTimeout(() => setStatus("saving"), 0);
    const t = window.setTimeout(() => {
      void persist(debounced);
    }, 80);

    return () => {
      window.clearTimeout(savingId);
      window.clearTimeout(t);
    };
  }, [debounced, canAutosave, persist]);

  // Retry sync: 2s, 5s, 10s then notify
  useEffect(() => {
    if (!online || !enabled || !ready || pending) return;
    if (status !== "offline" && status !== "waiting" && status !== "failed") {
      return;
    }
    const current = valueRef.current;
    if (isValueEmpty(current)) return;

    const attempt = retryCountRef.current;
    if (attempt >= RETRY_DELAYS_MS.length) {
      const id = window.setTimeout(() => {
        // only toast once per failure cycle
        if (retryCountRef.current >= RETRY_DELAYS_MS.length) {
          import("@/lib/toast").then(({ appToast }) => {
            appToast.error(
              "پاشەکەوت سەرنەکەوت",
              "Could not sync after 3 retries. Changes are kept locally."
            );
          });
          retryCountRef.current = RETRY_DELAYS_MS.length + 1;
        }
      }, 0);
      return () => window.clearTimeout(id);
    }

    const delay = RETRY_DELAYS_MS[attempt];
    const id = window.setTimeout(() => {
      retryCountRef.current = attempt + 1;
      void persist(current);
    }, delay);
    return () => window.clearTimeout(id);
  }, [online, status, enabled, ready, pending, persist, isValueEmpty]);

  // Flush on leave / hide / unload
  useEffect(() => {
    if (!enabled || !ready || !userId) return;

    function flush() {
      if (pending) return;
      const current = valueRef.current;
      if (isValueEmpty(current)) return;
      let json = "";
      try {
        json = JSON.stringify(current);
      } catch {
        return;
      }
      if (json === lastSavedJson.current) return;
      try {
        const record = writeDraft(userId, companyId, key, current, {
          title: label,
          moduleKey: moduleKey || moduleFromDraftKey(key),
          device: deviceLabel(),
          progress: estimateProgress(current),
          status: navigator.onLine ? "saved" : "draft",
        });
        lastSavedJson.current = json;
        if (syncServer && navigator.onLine) {
          void syncDraftToServer({
            key,
            data: current,
            savedAt: record.savedAt,
            expiresAt: record.expiresAt,
            meta: record.meta,
          });
        }
      } catch {
        /* ignore */
      }
    }

    function onBeforeUnload(e: BeforeUnloadEvent) {
      flush();
      if (pending) {
        e.preventDefault();
        e.returnValue = "";
        return;
      }
      const current = valueRef.current;
      if (isValueEmpty(current)) return;
      let json = "";
      try {
        json = JSON.stringify(current);
      } catch {
        return;
      }
      if (
        status === "saving" ||
        status === "failed" ||
        status === "unsaved" ||
        status === "offline" ||
        json !== lastSavedJson.current
      ) {
        e.preventDefault();
        e.returnValue = "";
      }
    }

    function onPageHide() {
      flush();
    }

    function onVisibility() {
      if (document.visibilityState === "hidden") flush();
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [
    enabled,
    ready,
    pending,
    status,
    isValueEmpty,
    userId,
    companyId,
    key,
    syncServer,
    label,
    moduleKey,
  ]);

  const restoreDraft = useCallback((): T | null => {
    if (!pending) return null;
    const data = pending.data;
    try {
      lastSavedJson.current = JSON.stringify(data);
    } catch {
      lastSavedJson.current = "";
    }
    baselineRef.current = data;
    setPending(null);
    setSavedAt(pending.savedAt);
    setStatus("restored");
    window.setTimeout(() => setStatus("saved"), 2500);
    return data;
  }, [pending]);

  const discardDraft = useCallback(() => {
    if (userId) clearDraftStorage(userId, key);
    if (syncServer) void deleteServerDraft(key);
    setPending(null);
    lastSavedJson.current = "";
    setStatus("idle");
    setSavedAt(null);
  }, [key, userId, syncServer]);

  const clearDraft = useCallback(() => {
    if (userId) clearDraftStorage(userId, key);
    if (syncServer) void deleteServerDraft(key);
    lastSavedJson.current = "";
    setPending(null);
    setStatus("idle");
    setSavedAt(null);
    updateRef.current(sourceId, {
      state: "clean",
      changeSummary: [],
      savedAt: null,
    });
  }, [key, userId, syncServer, sourceId]);

  const forceSave = useCallback(async () => {
    return persist(valueRef.current);
  }, [persist]);

  return {
    status,
    savedAt,
    ready,
    online,
    pendingDraft: pending,
    hasPendingDraft: Boolean(pending),
    restoreDraft,
    discardDraft,
    clearDraft,
    forceSave,
    isDirty:
      status === "unsaved" ||
      status === "saving" ||
      status === "failed" ||
      status === "offline" ||
      status === "waiting",
  };
}

const DRAFT_TTL_FALLBACK = 30 * 24 * 60 * 60 * 1000;
