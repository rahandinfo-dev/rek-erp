"use client";

import { useMemo, useState } from "react";
import {
  LayoutGrid,
  Plus,
  RotateCcw,
  Search,
  Settings2,
  Star,
} from "lucide-react";
import { useDashboardWorkspace } from "@/lib/dashboard/workspace/provider";
import {
  WIDGET_CATALOG,
  catalogByKey,
} from "@/lib/dashboard/workspace/types";
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
    restoreWidget,
    recommendations,
  } = useDashboardWorkspace();
  const [query, setQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  const hiddenWidgets = useMemo(() => {
    const q = query.trim().toLowerCase();
    const hiddenKeys = new Set(
      (active?.widgets || []).filter((w) => w.hidden).map((w) => w.widgetKey)
    );
    // Also catalog widgets never present
    const present = new Set((active?.widgets || []).map((w) => w.widgetKey));
    return WIDGET_CATALOG.filter((c) => {
      const isHidden = hiddenKeys.has(c.key) || !present.has(c.key);
      if (!isHidden) return false;
      if (!q) return true;
      return (
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
      );
    });
  }, [active, query]);

  return (
    <div className="space-y-3">
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
            onClick={() => setPickerOpen((v) => !v)}
          >
            <Settings2 size={14} /> Widgets
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

      {recommendations.length ? (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-muted/40 px-3 py-2">
          <span className="text-[11px] font-bold text-muted-foreground">
            Suggested:
          </span>
          {recommendations.map((key) => (
            <button
              key={key}
              type="button"
              className="rounded-lg bg-card px-2 py-1 text-[11px] font-bold ring-1 ring-border hover:ring-primary/40"
              onClick={() => restoreWidget(key)}
            >
              + {catalogByKey(key)?.title || key}
            </button>
          ))}
        </div>
      ) : null}

      {pickerOpen ? (
        <div className="rek-card space-y-3 p-4">
          <div className="relative">
            <Search
              size={14}
              className="pointer-events-none absolute top-1/2 start-3 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search widgets…"
              className="h-10 w-full rounded-xl border border-border bg-background pe-3 ps-9 text-sm outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>
          <div className="grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
            {hiddenWidgets.length === 0 ? (
              <p className="text-sm text-muted-foreground sm:col-span-2 lg:col-span-3">
                All widgets are visible. Hide one from its menu to manage here.
              </p>
            ) : (
              hiddenWidgets.map((w) => (
                <button
                  key={w.key}
                  type="button"
                  className="rounded-xl border border-border bg-background p-3 text-start hover:border-primary/40"
                  onClick={() => restoreWidget(w.key)}
                >
                  <p className="text-sm font-bold">{w.title}</p>
                  <p className="text-xs text-muted-foreground">{w.description}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase text-primary">
                    {w.category}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
