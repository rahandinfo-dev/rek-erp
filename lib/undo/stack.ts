"use client";

import type { UndoEntry, UndoModule, UndoSerializable } from "@/lib/undo/types";
import { UNDO_STACK_LIMIT, UNDO_WINDOW_MS } from "@/lib/undo/types";

type Listener = () => void;

type ModuleStacks = {
  undo: UndoEntry[];
  redo: UndoEntry[];
};

function emptyStacks(): ModuleStacks {
  return { undo: [], redo: [] };
}

export type UndoSnapshot = {
  userId: string;
  companyId: string;
  modules: Record<string, { undo: number; redo: number }>;
  canUndo: boolean;
  canRedo: boolean;
  topUndo: UndoEntry | null;
  topRedo: UndoEntry | null;
};

/**
 * Shared identity used for SSR and for the empty client state so that
 * `useSyncExternalStore` never sees a new object on an unchanged store.
 */
const EMPTY_SNAPSHOT: UndoSnapshot = Object.freeze({
  userId: "",
  companyId: "",
  modules: Object.freeze({}) as Record<string, { undo: number; redo: number }>,
  canUndo: false,
  canRedo: false,
  topUndo: null,
  topRedo: null,
});

/**
 * In-memory, user-scoped undo/redo stacks — separate per module.
 */
class UndoStackStore {
  private userId = "";
  private companyId = "";
  private stacks = new Map<string, ModuleStacks>();
  private listeners = new Set<Listener>();
  private timers = new Map<string, number>();
  private snapshot: UndoSnapshot = EMPTY_SNAPSHOT;

  setOwner(userId: string, companyId: string) {
    if (this.userId === userId && this.companyId === companyId) return;
    if (this.userId && this.userId !== userId) {
      this.clearAll();
    }
    this.userId = userId;
    this.companyId = companyId;
    this.emit();
  }

  getOwner() {
    return { userId: this.userId, companyId: this.companyId };
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit() {
    this.snapshot = this.buildSnapshot();
    this.listeners.forEach((l) => l());
  }

  private getModule(module: UndoModule): ModuleStacks {
    const key = String(module);
    let s = this.stacks.get(key);
    if (!s) {
      s = emptyStacks();
      this.stacks.set(key, s);
    }
    return s;
  }

  peekUndo(module?: UndoModule): UndoEntry | null {
    if (module) {
      const s = this.getModule(module);
      return s.undo[s.undo.length - 1] ?? null;
    }
    // Global: most recent across modules
    let best: UndoEntry | null = null;
    for (const s of this.stacks.values()) {
      const top = s.undo[s.undo.length - 1];
      if (top && (!best || top.createdAt > best.createdAt)) best = top;
    }
    return best;
  }

  peekRedo(module?: UndoModule): UndoEntry | null {
    if (module) {
      const s = this.getModule(module);
      return s.redo[s.redo.length - 1] ?? null;
    }
    let best: UndoEntry | null = null;
    for (const s of this.stacks.values()) {
      const top = s.redo[s.redo.length - 1];
      if (top && (!best || top.createdAt > best.createdAt)) best = top;
    }
    return best;
  }

  canUndo(module?: UndoModule) {
    return Boolean(this.peekUndo(module));
  }

  canRedo(module?: UndoModule) {
    return Boolean(this.peekRedo(module));
  }

  push(entry: UndoEntry) {
    if (this.userId && entry.userId && entry.userId !== this.userId) {
      return; // never accept another user's action
    }
    const s = this.getModule(entry.module);
    s.undo.push(entry);
    if (s.undo.length > UNDO_STACK_LIMIT) {
      const dropped = s.undo.shift();
      if (dropped) this.clearTimer(dropped.id);
    }
    // New forward action clears redo for that module
    s.redo = [];
    this.scheduleExpiry(entry);
    this.emit();
  }

  private clearTimer(id: string) {
    const t = this.timers.get(id);
    if (t) {
      window.clearTimeout(t);
      this.timers.delete(id);
    }
  }

  private scheduleExpiry(entry: UndoEntry) {
    this.clearTimer(entry.id);
    const ms = Math.max(0, entry.expiresAt - Date.now());
    const timer = window.setTimeout(() => {
      void this.expire(entry.id);
    }, ms || UNDO_WINDOW_MS);
    this.timers.set(entry.id, timer);
  }

  async expire(id: string) {
    this.clearTimer(id);
    for (const s of this.stacks.values()) {
      const idx = s.undo.findIndex((e) => e.id === id);
      if (idx >= 0) {
        const entry = s.undo[idx];
        if (entry.status === "active") {
          entry.status = "expired";
          try {
            await entry.commit?.();
          } catch {
            /* never corrupt — leave soft state */
          }
          entry.status = "committed";
        }
        // Keep in stack for multi-level history beyond toast window,
        // but toast-only window is over; commit ran.
        this.emit();
        return;
      }
    }
  }

  /** Undo a specific entry (toast Undo) without requiring LIFO top. */
  async undoExact(id: string): Promise<UndoEntry | null> {
    for (const s of this.stacks.values()) {
      const idx = s.undo.findIndex((e) => e.id === id);
      if (idx < 0) continue;
      const [entry] = s.undo.splice(idx, 1);
      if (this.userId && entry.userId !== this.userId) {
        s.undo.splice(idx, 0, entry);
        return null;
      }
      this.clearTimer(entry.id);
      try {
        await entry.undo();
        entry.status = "undone";
        s.redo.push(entry);
        this.emit();
        return entry;
      } catch (error) {
        s.undo.splice(idx, 0, entry);
        this.scheduleExpiry(entry);
        this.emit();
        throw error;
      }
    }
    return null;
  }

  async undo(module?: UndoModule): Promise<UndoEntry | null> {
    const entry = this.peekUndo(module);
    if (!entry) return null;
    return this.undoExact(entry.id);
  }

  async redo(module?: UndoModule): Promise<UndoEntry | null> {
    const entry = this.peekRedo(module);
    if (!entry) return null;
    if (this.userId && entry.userId !== this.userId) return null;

    const s = this.getModule(entry.module);
    s.redo.pop();

    try {
      await entry.redo();
      entry.status = "redone";
      entry.createdAt = Date.now();
      entry.expiresAt = Date.now() + UNDO_WINDOW_MS;
      entry.status = "active";
      s.undo.push(entry);
      this.scheduleExpiry(entry);
      this.emit();
      return entry;
    } catch (error) {
      s.redo.push(entry);
      this.emit();
      throw error;
    }
  }

  /** Snapshot for offline persistence (handlers stripped). */
  serializePending(): UndoSerializable[] {
    const out: UndoSerializable[] = [];
    for (const s of this.stacks.values()) {
      for (const e of s.undo) {
        if (e.status !== "active") continue;
        out.push({
          id: e.id,
          userId: e.userId,
          companyId: e.companyId,
          module: e.module,
          kind: e.kind,
          label: e.label,
          createdAt: e.createdAt,
          expiresAt: e.expiresAt,
          status: e.status,
          meta: e.meta,
        });
      }
    }
    return out;
  }

  clearAll() {
    for (const id of this.timers.keys()) this.clearTimer(id);
    this.stacks.clear();
    this.emit();
  }

  private buildSnapshot(): UndoSnapshot {
    const modules: Record<string, { undo: number; redo: number }> = {};
    for (const [k, s] of this.stacks) {
      modules[k] = { undo: s.undo.length, redo: s.redo.length };
    }
    return {
      userId: this.userId,
      companyId: this.companyId,
      modules,
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      topUndo: this.peekUndo(),
      topRedo: this.peekRedo(),
    };
  }

  /**
   * Stable reference — only replaced inside `emit()`. `useSyncExternalStore`
   * compares snapshots with `Object.is`, so returning a fresh object here
   * would re-render forever.
   */
  getSnapshot(): UndoSnapshot {
    return this.snapshot;
  }

  getServerSnapshot(): UndoSnapshot {
    return EMPTY_SNAPSHOT;
  }
}

export const undoStore = new UndoStackStore();
