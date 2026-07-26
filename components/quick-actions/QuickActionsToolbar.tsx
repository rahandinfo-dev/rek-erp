"use client";

import { useMemo, useState } from "react";
import {
  Archive,
  Copy,
  Eye,
  FileSpreadsheet,
  Files,
  Pencil,
  Printer,
  Settings2,
  Trash2,
} from "lucide-react";
import { resolveActions } from "@/lib/quick-actions/registry";
import { permissionsForModule } from "@/lib/quick-actions/permissions";
import type {
  QuickActionId,
  QuickActionPrefs,
  QuickActionRecord,
} from "@/lib/quick-actions/types";
import { cn } from "@/lib/utils";
import QuickActionsCustomize from "@/components/quick-actions/QuickActionsCustomize";

const ICONS: Partial<Record<QuickActionId, typeof Eye>> = {
  view: Eye,
  edit: Pencil,
  duplicate: Files,
  copy: Copy,
  archive: Archive,
  soft_delete: Trash2,
  print: Printer,
  export_csv: FileSpreadsheet,
  export_excel: FileSpreadsheet,
};

type Props = {
  moduleKey: string;
  records: QuickActionRecord[];
  prefs: QuickActionPrefs;
  onAction: (id: QuickActionId) => void;
  onPrefsChange: (prefs: QuickActionPrefs) => void;
  onResetPrefs: () => void;
  className?: string;
};

export default function QuickActionsToolbar({
  moduleKey,
  records,
  prefs,
  onAction,
  onPrefsChange,
  onResetPrefs,
  className,
}: Props) {
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const permissions = useMemo(
    () => permissionsForModule(moduleKey),
    [moduleKey]
  );

  const actions = useMemo(() => {
    const resolved = resolveActions({
      moduleKey,
      records,
      pinnedIds: prefs.pinnedIds,
      hiddenIds: prefs.hiddenIds,
      orderOverride: prefs.orderByModule[moduleKey],
      includeLazy: false,
      allowedPermissions: permissions,
    });
    // Toolbar: pinned first, max 8
    const pinned = resolved.filter((a) => prefs.pinnedIds.includes(a.id));
    const rest = resolved.filter((a) => !prefs.pinnedIds.includes(a.id));
    return [...pinned, ...rest].slice(0, 8);
  }, [moduleKey, records, prefs, permissions]);

  if (!records.length) return null;

  return (
    <>
      <div
        role="toolbar"
        aria-label="کردارە خێراکان"
        className={cn(
          "flex flex-wrap items-center gap-1.5 rounded-2xl border border-primary/20 bg-primary/5 px-3 py-2",
          className
        )}
      >
        <span className="me-1 text-xs font-bold text-muted-foreground">
          Quick · {records.length}
        </span>
        {actions.map((def) => {
          const Icon = ICONS[def.id] || Eye;
          return (
            <button
              key={def.id}
              type="button"
              data-keyboard-delete={
                def.id === "soft_delete" ? "true" : undefined
              }
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-2.5 text-xs font-bold shadow-[var(--shadow-xs)] transition hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/35",
                def.destructive &&
                  "border-destructive/30 text-destructive hover:bg-destructive/10"
              )}
              onClick={() => onAction(def.id)}
              title={def.shortcut ? `${def.label} (${def.shortcut})` : def.label}
            >
              <Icon size={14} aria-hidden />
              {def.label}
            </button>
          );
        })}
        <button
          type="button"
          className="ms-auto inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-2.5 text-xs font-bold hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/35"
          onClick={() => setCustomizeOpen(true)}
          aria-label="Customize quick actions"
        >
          <Settings2 size={14} aria-hidden />
          Customize
        </button>
      </div>

      <QuickActionsCustomize
        open={customizeOpen}
        moduleKey={moduleKey}
        prefs={prefs}
        onClose={() => setCustomizeOpen(false)}
        onSave={onPrefsChange}
        onReset={onResetPrefs}
      />
    </>
  );
}
