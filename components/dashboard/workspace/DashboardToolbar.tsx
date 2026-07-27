"use client";

import { LayoutGrid, Plus, RotateCcw, Star } from "lucide-react";
import { useDashboardWorkspace } from "@/lib/dashboard/workspace/provider";
import { useT } from "@/components/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

export default function DashboardToolbar() {
  const { t } = useT();
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
          aria-label={t("dashboard.switchDashboard")}
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
            const name = window.prompt(t("dashboard.dashboardName"));
            if (name) createDashboard(name);
          }}
        >
          <Plus size={14} /> {t("common.new")}
        </button>
        {active ? (
          <>
            <button
              type="button"
              className="h-10 rounded-xl border border-border bg-card px-3 text-xs font-bold"
              onClick={() => {
                const name = window.prompt(
                  t("dashboard.renameDashboard"),
                  active.name
                );
                if (name) renameDashboard(active.id, name);
              }}
            >
              {t("common.rename")}
            </button>
            <button
              type="button"
              className="h-10 rounded-xl border border-border bg-card px-3 text-xs font-bold"
              onClick={() => duplicateDashboard(active.id)}
            >
              {t("common.duplicate")}
            </button>
            <button
              type="button"
              className="h-10 rounded-xl border border-border bg-card px-3 text-xs font-bold"
              onClick={() => setDefaultDashboard(active.id)}
              title={t("dashboard.setDefault")}
            >
              <Star size={14} className="inline" /> {t("common.default")}
            </button>
            {bundle.dashboards.length > 1 ? (
              <button
                type="button"
                className="h-10 rounded-xl border border-border px-3 text-xs font-bold text-destructive"
                onClick={() => {
                  if (window.confirm(t("dashboard.deleteDashboardConfirm"))) {
                    deleteDashboard(active.id);
                  }
                }}
              >
                {t("common.delete")}
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
          {editMode ? t("dashboard.done") : t("dashboard.customize")}
        </button>
        <button
          type="button"
          className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-xs font-bold"
          onClick={() => {
            if (window.confirm(t("dashboard.restoreLayoutConfirm"))) {
              restoreDefaultLayout();
            }
          }}
        >
          <RotateCcw size={14} /> {t("dashboard.restore")}
        </button>
      </div>
    </div>
  );
}
