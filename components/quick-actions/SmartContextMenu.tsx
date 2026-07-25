"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  Copy,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  FileText,
  FolderInput,
  History,
  Link2,
  Pencil,
  Pin,
  Printer,
  RotateCcw,
  Share2,
  Star,
  Trash2,
  Files,
  Clock,
} from "lucide-react";
import { ACTION_DEFS, resolveActions } from "@/lib/quick-actions/registry";
import { permissionsForModule } from "@/lib/quick-actions/permissions";
import type {
  QuickActionId,
  QuickActionPrefs,
  QuickActionRecord,
} from "@/lib/quick-actions/types";
import { cn } from "@/lib/utils";

const ICONS: Partial<Record<QuickActionId, typeof Eye>> = {
  view: Eye,
  edit: Pencil,
  duplicate: Files,
  copy: Copy,
  move: FolderInput,
  archive: Archive,
  soft_delete: Trash2,
  restore: RotateCcw,
  print: Printer,
  export_pdf: FileText,
  export_excel: FileSpreadsheet,
  export_csv: FileSpreadsheet,
  share: Share2,
  copy_link: Link2,
  open_new_tab: ExternalLink,
  favorite: Star,
  pin: Pin,
  timeline: Clock,
  audit: History,
};

type Props = {
  open: boolean;
  x: number;
  y: number;
  moduleKey: string;
  records: QuickActionRecord[];
  prefs: QuickActionPrefs;
  onClose: () => void;
  onAction: (id: QuickActionId) => void;
};

function MenuBody({
  x,
  y,
  moduleKey,
  records,
  prefs,
  onClose,
  onAction,
}: Omit<Props, "open">) {
  const ref = useRef<HTMLDivElement>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [focusIdx, setFocusIdx] = useState(0);

  const permissions = useMemo(
    () => permissionsForModule(moduleKey),
    [moduleKey]
  );

  const primary = useMemo(
    () =>
      resolveActions({
        moduleKey,
        records,
        pinnedIds: prefs.pinnedIds,
        hiddenIds: prefs.hiddenIds,
        orderOverride: prefs.orderByModule[moduleKey],
        includeLazy: false,
        allowedPermissions: permissions,
      }),
    [moduleKey, records, prefs, permissions]
  );

  const advanced = useMemo(
    () =>
      resolveActions({
        moduleKey,
        records,
        pinnedIds: prefs.pinnedIds,
        hiddenIds: prefs.hiddenIds,
        orderOverride: prefs.orderByModule[moduleKey],
        includeLazy: true,
        allowedPermissions: permissions,
      }).filter((d) => d.lazy),
    [moduleKey, records, prefs, permissions]
  );

  const items = useMemo(() => {
    const list = [...primary];
    if (showAdvanced) list.push(...advanced);
    return list;
  }, [primary, advanced, showAdvanced]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    let nx = x;
    let ny = y;
    if (nx + rect.width > window.innerWidth - 8) {
      nx = Math.max(8, window.innerWidth - rect.width - 8);
    }
    if (ny + rect.height > window.innerHeight - 8) {
      ny = Math.max(8, window.innerHeight - rect.height - 8);
    }
    el.style.left = `${nx}px`;
    el.style.top = `${ny}px`;

    const btn = el.querySelector<HTMLButtonElement>("[data-qa-item]");
    btn?.focus();
  }, [x, y, items.length]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusIdx((i) => Math.min(items.length - 1, i + 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusIdx((i) => Math.max(0, i - 1));
      }
      if (e.key === "Enter" && items[focusIdx]) {
        e.preventDefault();
        onAction(items[focusIdx]!.id);
      }
    }
    function onPointer(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointer);
    };
  }, [onClose, onAction, items, focusIdx]);

  useEffect(() => {
    const buttons = ref.current?.querySelectorAll<HTMLButtonElement>(
      "[data-qa-item]"
    );
    buttons?.[focusIdx]?.focus();
  }, [focusIdx]);

  const title =
    records.length > 1
      ? `${records.length} selected`
      : records[0]?.label || "Actions";

  return (
    <div
      ref={ref}
      role="menu"
      aria-label="Context actions"
      className="fixed z-[80] min-w-[220px] max-w-[280px] rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-[var(--shadow-md)]"
      style={{ left: x, top: y }}
    >
      <p className="truncate px-2.5 py-1.5 text-[11px] font-bold text-muted-foreground">
        {title}
      </p>
      <ul className="max-h-[min(70vh,420px)] overflow-y-auto">
        {items.map((def, idx) => {
          const Icon = ICONS[def.id] || Eye;
          const destructive = Boolean(def.destructive);
          return (
            <li key={def.id} role="none">
              <button
                type="button"
                role="menuitem"
                data-qa-item
                tabIndex={focusIdx === idx ? 0 : -1}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-start text-xs font-semibold outline-none transition",
                  "hover:bg-muted focus-visible:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/35",
                  destructive && "text-destructive hover:bg-destructive/10"
                )}
                onClick={() => onAction(def.id)}
                onMouseEnter={() => setFocusIdx(idx)}
              >
                <Icon size={14} aria-hidden />
                <span className="flex-1">{def.label}</span>
                {def.shortcut ? (
                  <kbd className="text-[10px] font-normal text-muted-foreground">
                    {def.shortcut}
                  </kbd>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
      {!showAdvanced && advanced.length > 0 ? (
        <button
          type="button"
          className="mt-0.5 w-full rounded-lg px-2.5 py-2 text-start text-xs font-semibold text-muted-foreground hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/35"
          onClick={() => setShowAdvanced(true)}
        >
          More actions…
        </button>
      ) : null}
      {items.length === 0 ? (
        <p className="px-2.5 py-3 text-xs text-muted-foreground">
          No actions available
        </p>
      ) : null}
      <span className="sr-only">{ACTION_DEFS.view.label}</span>
    </div>
  );
}

export default function SmartContextMenu(props: Props) {
  if (!props.open) return null;
  const key = `${props.moduleKey}-${props.records.map((r) => r.id).join(",")}-${props.x}-${props.y}`;
  return <MenuBody key={key} {...props} />;
}
