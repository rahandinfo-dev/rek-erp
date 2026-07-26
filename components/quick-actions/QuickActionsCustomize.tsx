"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ACTION_DEFS,
  DEFAULT_MODULE_ACTIONS,
  DEFAULT_PINNED,
} from "@/lib/quick-actions/registry";
import type {
  QuickActionId,
  QuickActionPrefs,
} from "@/lib/quick-actions/types";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  moduleKey: string;
  prefs: QuickActionPrefs;
  onClose: () => void;
  onSave: (prefs: QuickActionPrefs) => void;
  onReset: () => void;
};

function CustomizeBody({
  moduleKey,
  prefs,
  onClose,
  onSave,
  onReset,
}: Omit<Props, "open">) {
  const baseIds =
    prefs.orderByModule[moduleKey] ||
    DEFAULT_MODULE_ACTIONS[moduleKey] ||
    DEFAULT_MODULE_ACTIONS.products ||
    [];

  const [pinnedIds, setPinnedIds] = useState<QuickActionId[]>(prefs.pinnedIds);
  const [hiddenIds, setHiddenIds] = useState<QuickActionId[]>(prefs.hiddenIds);
  const [order, setOrder] = useState<QuickActionId[]>(baseIds);

  function move(id: QuickActionId, dir: -1 | 1) {
    setOrder((prev) => {
      const i = prev.indexOf(id);
      if (i < 0) return prev;
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      const tmp = next[i]!;
      next[i] = next[j]!;
      next[j] = tmp;
      return next;
    });
  }

  function togglePin(id: QuickActionId) {
    setPinnedIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id].slice(0, 12)
    );
  }

  function toggleHidden(id: QuickActionId) {
    setHiddenIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function save() {
    onSave({
      ...prefs,
      pinnedIds,
      hiddenIds,
      orderByModule: {
        ...prefs.orderByModule,
        [moduleKey]: order,
      },
      updatedAt: Date.now(),
    });
    onClose();
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Customize Quick Actions</DialogTitle>
        <DialogDescription>
          Pin favorites, reorder, or hide unused actions for this module.
        </DialogDescription>
      </DialogHeader>

      <ul className="mt-4 space-y-1">
        {order.map((id, idx) => {
          const def = ACTION_DEFS[id];
          if (!def) return null;
          const pinned = pinnedIds.includes(id);
          const hidden = hiddenIds.includes(id);
          return (
            <li
              key={id}
              className={cn(
                "flex items-center gap-2 rounded-xl border border-border px-2.5 py-2 text-sm",
                hidden && "opacity-50"
              )}
            >
              <span className="flex-1 font-semibold">{def.label}</span>
              <button
                type="button"
                className="rounded-lg px-2 py-1 text-xs font-bold hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/35"
                onClick={() => move(id, -1)}
                disabled={idx === 0}
                aria-label={`Move ${def.label} up`}
              >
                ↑
              </button>
              <button
                type="button"
                className="rounded-lg px-2 py-1 text-xs font-bold hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/35"
                onClick={() => move(id, 1)}
                disabled={idx === order.length - 1}
                aria-label={`Move ${def.label} down`}
              >
                ↓
              </button>
              <button
                type="button"
                className={cn(
                  "rounded-lg px-2 py-1 text-xs font-bold focus-visible:ring-[3px] focus-visible:ring-ring/35",
                  pinned ? "bg-amber-100 text-amber-800" : "hover:bg-muted"
                )}
                onClick={() => togglePin(id)}
              >
                {pinned ? "Pinned" : "هەڵواسین"}
              </button>
              <button
                type="button"
                className="rounded-lg px-2 py-1 text-xs font-bold hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/35"
                onClick={() => toggleHidden(id)}
              >
                {hidden ? "Show" : "Hide"}
              </button>
            </li>
          );
        })}
      </ul>

      <DialogFooter className="mt-6 gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setPinnedIds([...DEFAULT_PINNED]);
            setHiddenIds([]);
            setOrder(
              DEFAULT_MODULE_ACTIONS[moduleKey] ||
                DEFAULT_MODULE_ACTIONS.products ||
                []
            );
            onReset();
          }}
        >
          Reset to default
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" onClick={save}>
          Save
        </Button>
      </DialogFooter>
    </>
  );
}

export default function QuickActionsCustomize({
  open,
  moduleKey,
  prefs,
  onClose,
  onSave,
  onReset,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        {open ? (
          <CustomizeBody
            key={`${moduleKey}-${prefs.updatedAt}`}
            moduleKey={moduleKey}
            prefs={prefs}
            onClose={onClose}
            onSave={onSave}
            onReset={onReset}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
