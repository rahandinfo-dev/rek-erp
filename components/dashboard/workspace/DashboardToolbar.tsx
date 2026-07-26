"use client";

import { LayoutGrid, Plus, RotateCcw, Star } from "lucide-react";
import { useDashboardWorkspace } from "@/lib/dashboard/workspace/provider";
import { cn } from "@/lib/utils";

export default function DashboardToolbar() {
  const {
    editMode,
    setEditMode,
    bundle,
    active,
    switchDashboard,
    createDashboard,
    renameDashboard,
    duplicateDashboard,
    deleteDashboard,
    setDefaultDashboard,
    restoreDefaultLayout,
  } = useDashboardWorkspace();

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <select
          className="h-10 max-w-full rounded-xl border border-border bg-card px-3 text-sm font-bold"
          value={active?.id || ""}
          onChange={(e) => switchDashboard(e.target.value)}
          aria-label="Switch dashboard"
        >
          {bundle.dashboards.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
              {d.isDefault ? " ★" : ""}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-xs font-bold"
          onClick={() => {
            const name = window.prompt("Dashboard name");
            if (name) createDashboard(name);
          }}
        >
          <Plus size={14} /> New
        </button>
        {active ? (
          <>
            <button
              type="button"
              className="h-10 rounded-xl border border-border bg-card px-3 text-xs font-bold"
              onClick={() => {
                const name = window.prompt("Rename dashboard", active.name);
                if (name) renameDashboard(active.id, name);
              }}
            >
              Rename
            </button>
            <button
              type="button"
              className="h-10 rounded-xl border border-border bg-card px-3 text-xs font-bold"
              onClick={() => duplicateDashboard(active.id)}
            >
              Duplicate
            </button>
            <button
              type="button"
              className="h-10 rounded-xl border border-border bg-card px-3 text-xs font-bold"
              onClick={() => setDefaultDashboard(active.id)}
              title="Set as default on login"
            >
              <Star size={14} className="inline" /> Default
            </button>
            {bundle.dashboards.length > 1 ? (
              <button
                type="button"
                className="h-10 rounded-xl border border-border px-3 text-xs font-bold text-destructive"
                onClick={() => {
                  if (window.confirm("Delete this dashboard?")) {
                    deleteDashboard(active.id);
                  }
                }}
              >
                Delete
              </button>
            ) : null}
          </>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={cn(
            "inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-bold",
            editMode
              ? "bg-primary text-primary-foreground"
              : "border border-border bg-card"
          )}
          onClick={() => setEditMode(!editMode)}
        >
          <LayoutGrid size={14} />
          {editMode ? "Done" : "Customize"}
        </button>
        <button
          type="button"
          className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-xs font-bold"
          onClick={() => {
            if (window.confirm("Restore default layout?")) {
              restoreDefaultLayout();
            }
          }}
        >
          <RotateCcw size={14} /> Restore
        </button>
      </div>
    </div>
  );
}
