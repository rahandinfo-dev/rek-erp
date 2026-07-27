"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  GripVertical,
  Maximize2,
  MoreHorizontal,
  Pin,
  PinOff,
  RefreshCw,
  Settings2,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/components/i18n/LocaleProvider";
import { useDashboardWorkspace } from "@/lib/dashboard/workspace/provider";
import {
  catalogByKey,
  type RefreshInterval,
  type WidgetInstance,
  type WidgetSize,
} from "@/lib/dashboard/workspace/types";
import { appToast } from "@/lib/toast";

const SIZES: WidgetSize[] = ["small", "medium", "large", "xlarge"];
const REFRESH: RefreshInterval[] = [0, 30, 60, 300, 900, 1800];

type Props = {
  instance: WidgetInstance;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  isDragging?: boolean;
  onRefresh?: () => void;
  children: React.ReactNode;
};

export default function WidgetShell({
  instance,
  dragHandleProps,
  isDragging,
  onRefresh,
  children,
}: Props) {
  const { t } = useT();
  const {
    editMode,
    setWidgetSize,
    togglePin,
    toggleFavorite,
    toggleHidden,
    toggleCollapsed,
    setWidgetSettings,
    duplicateWidget,
    removeWidget,
  } = useDashboardWorkspace();
  const [menu, setMenu] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const meta = catalogByKey(instance.widgetKey);

  // `onRefresh` is usually an inline arrow from the workspace grid; keeping it
  // out of the deps stops the timer from restarting on every parent render.
  const onRefreshRef = useRef(onRefresh);
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    const interval = instance.settings.refreshInterval;
    if (!interval || instance.hidden || instance.collapsed) return;
    const id = window.setInterval(() => {
      onRefreshRef.current?.();
    }, interval * 1000);
    return () => window.clearInterval(id);
  }, [instance.settings.refreshInterval, instance.hidden, instance.collapsed]);

  async function exportWidget(kind: "png" | "csv") {
    try {
      if (kind === "csv") {
        const blob = new Blob(
          [
            `widget,${meta?.title || instance.widgetKey}\nkey,${instance.widgetKey}\n`,
          ],
          { type: "text/csv" }
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${instance.widgetKey}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (shellRef.current) {
        // Lightweight PNG via SVG foreignObject fallback → canvas clone text export
        const title = meta?.title || instance.widgetKey;
        const canvas = document.createElement("canvas");
        canvas.width = 800;
        canvas.height = 200;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, 800, 200);
          ctx.fillStyle = "#111";
          ctx.font = "bold 28px sans-serif";
          ctx.fillText(title, 32, 80);
          ctx.font = "16px sans-serif";
          ctx.fillStyle = "#666";
          ctx.fillText("REK Dashboard Widget Export", 32, 120);
          const url = canvas.toDataURL("image/png");
          const a = document.createElement("a");
          a.href = url;
          a.download = `${instance.widgetKey}.png`;
          a.click();
        }
      }
      appToast.success("هەناردە کرا");
    } catch {
      appToast.error("هەناردەکردن سەرنەکەوت");
    }
    setMenu(false);
  }

  const body = (
    <div
      ref={shellRef}
      data-widget-key={instance.widgetKey}
      className={cn(
        "rek-widget group/widget relative flex min-h-0 flex-col transition",
        instance.settings.compactMode && "text-sm",
        isDragging && "opacity-70 ring-2 ring-primary",
        fullscreen && "fixed inset-4 z-[80] overflow-auto rounded-2xl bg-card p-4 shadow-2xl"
      )}
    >
      <div className="mb-2 flex items-center gap-1.5">
        {editMode ? (
          <button
            type="button"
            className="cursor-grab rounded-lg p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
            aria-label={t("dashboard.dragWidget")}
            {...dragHandleProps}
          >
            <GripVertical size={14} />
          </button>
        ) : null}
        <p className="min-w-0 flex-1 truncate text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
          {meta?.title || instance.widgetKey}
        </p>
        {instance.pinned ? (
          <Pin size={12} className="text-primary" aria-hidden />
        ) : null}
        {instance.favorite ? (
          <Star size={12} className="fill-amber-400 text-amber-500" />
        ) : null}
        <button
          type="button"
          className="rounded-lg p-1 text-muted-foreground opacity-0 transition hover:bg-muted hover:text-foreground group-hover/widget:opacity-100 focus:opacity-100"
          aria-label="Collapse"
          onClick={() => toggleCollapsed(instance.id)}
        >
          {instance.collapsed ? (
            <ChevronDown size={14} />
          ) : (
            <ChevronUp size={14} />
          )}
        </button>
        <div className="relative">
          <button
            type="button"
            className="rounded-lg p-1 text-muted-foreground opacity-0 transition hover:bg-muted hover:text-foreground group-hover/widget:opacity-100 focus:opacity-100"
            aria-label={t("dashboard.widgetMenu")}
            onClick={() => setMenu((v) => !v)}
          >
            <MoreHorizontal size={14} />
          </button>
          {menu ? (
            <div className="absolute end-0 top-7 z-40 min-w-[170px] rounded-xl border border-border bg-card p-1 shadow-lg">
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold hover:bg-muted"
                onClick={() => {
                  onRefresh?.();
                  setMenu(false);
                }}
              >
                <RefreshCw size={12} /> {t("common.refresh")}
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold hover:bg-muted"
                onClick={() => {
                  duplicateWidget(instance.id);
                  setMenu(false);
                }}
              >
                <Copy size={12} /> {t("common.duplicate")}
              </button>
              <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground">
                {t("dashboard.resize")}
              </div>
              <div className="mb-1 flex flex-wrap gap-1 px-2">
                {SIZES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={cn(
                      "rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase",
                      instance.size === s
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                    onClick={() => {
                      setWidgetSize(instance.id, s);
                      setMenu(false);
                    }}
                  >
                    {s[0]}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold hover:bg-muted"
                onClick={() => {
                  togglePin(instance.id);
                  setMenu(false);
                }}
              >
                {instance.pinned ? <PinOff size={12} /> : <Pin size={12} />}
                {instance.pinned ? "لابردنی هەڵواسین" : "هەڵواسین"}
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold hover:bg-muted"
                onClick={() => {
                  toggleFavorite(instance.id);
                  setMenu(false);
                }}
              >
                <Star
                  size={12}
                  className={
                    instance.favorite ? "fill-amber-400 text-amber-500" : ""
                  }
                />
                {t("dashboard.favorite")}
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold hover:bg-muted"
                onClick={() => {
                  setFullscreen(true);
                  setMenu(false);
                }}
              >
                <Maximize2 size={12} /> {t("dashboard.fullScreen")}
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold hover:bg-muted"
                onClick={() => {
                  setSettingsOpen(true);
                  setMenu(false);
                }}
              >
                <Settings2 size={12} /> {t("common.settings")}
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold hover:bg-muted"
                onClick={() => void exportWidget("png")}
              >
                <Download size={12} /> {t("dashboard.exportPng")}
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold hover:bg-muted"
                onClick={() => void exportWidget("csv")}
              >
                <Download size={12} /> {t("dashboard.exportCsv")}
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold hover:bg-muted"
                onClick={() => {
                  toggleHidden(instance.id);
                  setMenu(false);
                  appToast.success("ویجێت شاردرایەوە");
                }}
              >
                <X size={12} /> {t("dashboard.hide")}
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10"
                onClick={() => {
                  removeWidget(instance.id);
                  setMenu(false);
                }}
              >
                <Trash2 size={12} /> {t("dashboard.remove")}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {!instance.collapsed ? (
        <div
          className={cn(
            "min-h-0 flex-1",
            instance.settings.displayMode === "compact" && "scale-[0.98]"
          )}
        >
          {children}
        </div>
      ) : null}

      {settingsOpen ? (
        <div className="absolute inset-0 z-50 flex items-end rounded-2xl bg-black/30 p-3 sm:items-center sm:justify-center">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-black">{t("dashboard.widgetSettings")}</h3>
              <button type="button" onClick={() => setSettingsOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <label className="mb-2 block text-xs font-bold">
              {t("dashboard.refreshInterval")}
              <select
                className="mt-1 h-9 w-full rounded-xl border border-border bg-background px-2 text-sm"
                value={instance.settings.refreshInterval}
                onChange={(e) =>
                  setWidgetSettings(instance.id, {
                    refreshInterval: Number(e.target.value) as RefreshInterval,
                  })
                }
              >
                {REFRESH.map((r) => (
                  <option key={r} value={r}>
                    {r === 0 ? "تەنها دەستی" : `${r}s`}
                  </option>
                ))}
              </select>
            </label>
            <label className="mb-2 block text-xs font-bold">
              {t("dashboard.itemCount")}
              <input
                type="number"
                min={1}
                max={50}
                className="mt-1 h-9 w-full rounded-xl border border-border bg-background px-2 text-sm"
                value={instance.settings.itemCount}
                onChange={(e) =>
                  setWidgetSettings(instance.id, {
                    itemCount: Number(e.target.value) || 5,
                  })
                }
              />
            </label>
            <label className="mb-2 flex items-center gap-2 text-xs font-bold">
              <input
                type="checkbox"
                checked={instance.settings.compactMode}
                onChange={(e) =>
                  setWidgetSettings(instance.id, {
                    compactMode: e.target.checked,
                  })
                }
              />
              {t("dashboard.compactMode")}
            </label>
            <label className="mb-2 block text-xs font-bold">
              {t("dashboard.colorTheme")}
              <select
                className="mt-1 h-9 w-full rounded-xl border border-border bg-background px-2 text-sm"
                value={instance.settings.colorTheme}
                onChange={(e) =>
                  setWidgetSettings(instance.id, {
                    colorTheme: e.target.value as WidgetInstance["settings"]["colorTheme"],
                  })
                }
              >
                {["default", "blue", "green", "orange", "purple", "red"].map(
                  (c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  )
                )}
              </select>
            </label>
            <button
              type="button"
              className="mt-2 h-9 w-full rounded-xl bg-primary text-sm font-bold text-primary-foreground"
              onClick={() => setSettingsOpen(false)}
            >
              {t("common.done")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );

  if (fullscreen) {
    return (
      <>
        <button
          type="button"
          className="fixed inset-0 z-[70] bg-black/50"
          aria-label="Close fullscreen"
          onClick={() => setFullscreen(false)}
        />
        {body}
      </>
    );
  }

  return body;
}

export function useWidgetHide(instance: WidgetInstance) {
  const { toggleHidden } = useDashboardWorkspace();
  return () => toggleHidden(instance.id);
}
