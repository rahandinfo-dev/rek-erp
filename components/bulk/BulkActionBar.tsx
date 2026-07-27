"use client";

import { useMemo, useState } from "react";
import {
  Archive,
  Copy,
  Download,
  Printer,
  RotateCcw,
  Tags,
  Trash2,
  Warehouse,
  FolderTree,
  Pencil,
  CheckSquare,
  Square,
  Filter,
} from "lucide-react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import BulkProgressDialog from "@/components/bulk/BulkProgressDialog";
import {
  startBulkJob,
  runBulkJobToCompletion,
  cancelBulkJob,
  undoBulkJob,
} from "@/lib/bulk/client";
import { MODULE_ACTIONS } from "@/lib/bulk/modules";
import {
  BULK_ACTION_LABELS,
  DESTRUCTIVE_BULK_ACTIONS,
  type BulkAction,
  type BulkJobSummary,
  type BulkModule,
  type BulkPayload,
} from "@/lib/bulk/types";
import { exportToCsv, exportToExcel } from "@/lib/export";
import { appToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { useT } from "@/components/i18n/LocaleProvider";

type Props = {
  moduleKey: BulkModule;
  selectedIds: string[];
  pageIds: string[];
  filteredIds: string[];
  allIds: string[];
  onSelectPage: () => void;
  onSelectFiltered: () => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onComplete?: () => void;
  className?: string;
};

export default function BulkActionBar({
  moduleKey,
  selectedIds,
  pageIds,
  filteredIds,
  allIds,
  onSelectPage,
  onSelectFiltered,
  onSelectAll,
  onDeselectAll,
  onComplete,
  className,
}: Props) {
  const { t } = useT();
  const actions = MODULE_ACTIONS[moduleKey] || [];
  const [pendingAction, setPendingAction] = useState<BulkAction | null>(null);
  const [payload, setPayload] = useState<BulkPayload>({});
  const [job, setJob] = useState<BulkJobSummary | null>(null);
  const [progressOpen, setProgressOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [undoing, setUndoing] = useState(false);

  const needsExtra = useMemo(() => {
    if (!pendingAction) return false;
    return [
      "edit",
      "change_status",
      "assign_category",
      "assign_warehouse",
      "add_tags",
      "move",
    ].includes(pendingAction);
  }, [pendingAction]);

  const destructive = pendingAction
    ? DESTRUCTIVE_BULK_ACTIONS.has(pendingAction)
    : false;

  async function execute(action: BulkAction, nextPayload: BulkPayload = {}) {
    setBusy(true);
    setProgressOpen(true);
    try {
      const started = await startBulkJob({
        moduleKey,
        action,
        ids: selectedIds,
        payload: nextPayload,
      });
      setJob(started);
      const finished = await runBulkJobToCompletion(started.id, setJob);
      setJob(finished);

      if (
        finished.exportRows &&
        finished.exportRows.length > 0 &&
        (action === "export_csv" ||
          action === "export_excel" ||
          action === "export_pdf" ||
          action === "print")
      ) {
        if (action === "export_excel") {
          await exportToExcel(
            `${moduleKey}-bulk.xlsx`,
            moduleKey,
            finished.exportRows
          );
        } else {
          exportToCsv(`${moduleKey}-bulk.csv`, finished.exportRows);
        }
        if (action === "print") {
          window.print();
        }
      }

      appToast.success(
        t("bulk.successTitle", {
          action: BULK_ACTION_LABELS[action] || action,
        }),
        t("bulk.successBody", {
          ok: finished.successCount,
          failed: finished.failedCount,
          skipped: finished.skippedCount,
        })
      );
      onDeselectAll();
      onComplete?.();
    } catch (error) {
      appToast.error(
        error instanceof Error ? error.message : t("bulk.failed")
      );
      setProgressOpen(false);
    } finally {
      setBusy(false);
      setPendingAction(null);
      setPayload({});
    }
  }

  function requestAction(action: BulkAction) {
    setPayload({});
    setPendingAction(action);
  }

  function confirmPending() {
    if (!pendingAction) return;
    void execute(pendingAction, payload);
  }

  if (selectedIds.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-border px-3 py-2 text-xs text-muted-foreground",
          className
        )}
        role="region"
        aria-label={t("bulk.selectionHelpers")}
      >
        <span className="font-bold">{t("bulk.label")}:</span>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-bold hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/35"
          onClick={onSelectPage}
        >
          <CheckSquare size={14} aria-hidden />{" "}
          {t("bulk.selectPage", { count: pageIds.length })}
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-bold hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/35"
          onClick={onSelectFiltered}
        >
          <Filter size={14} aria-hidden />{" "}
          {t("bulk.selectFiltered", { count: filteredIds.length })}
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-bold hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/35"
          onClick={onSelectAll}
        >
          {t("bulk.selectAll", { count: allIds.length })}
        </button>
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          "flex flex-col gap-3 rounded-2xl border border-border bg-muted/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
          className
        )}
        role="toolbar"
        aria-label={t("nav.bulk")}
      >
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-black">
            {t("bulk.selected", { count: selectedIds.length })}
          </span>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/35"
            onClick={onSelectPage}
          >
            <CheckSquare size={14} /> {t("bulk.page")}
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/35"
            onClick={onSelectFiltered}
          >
            <Filter size={14} /> {t("bulk.filtered")}
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/35"
            onClick={onSelectAll}
          >
            {t("bulk.all")}
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/35"
            onClick={onDeselectAll}
          >
            <Square size={14} /> {t("bulk.deselect")}
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {actions.includes("delete") && (
            <ActionBtn
              icon={Trash2}
              label="سڕینەوە"
              danger
              onClick={() => requestAction("delete")}
            />
          )}
          {actions.includes("restore") && (
            <ActionBtn
              icon={RotateCcw}
              label="گەڕاندنەوە"
              onClick={() => requestAction("restore")}
            />
          )}
          {actions.includes("archive") && (
            <ActionBtn
              icon={Archive}
              label="ئەرشیفکردن"
              onClick={() => requestAction("archive")}
            />
          )}
          {actions.includes("duplicate") && (
            <ActionBtn
              icon={Copy}
              label="دووبارەکردنەوە"
              onClick={() => requestAction("duplicate")}
            />
          )}
          {actions.includes("export_csv") && (
            <ActionBtn
              icon={Download}
              label="CSV"
              onClick={() => requestAction("export_csv")}
            />
          )}
          {actions.includes("export_excel") && (
            <ActionBtn
              icon={Download}
              label="Excel"
              onClick={() => requestAction("export_excel")}
            />
          )}
          {actions.includes("print") && (
            <ActionBtn
              icon={Printer}
              label="چاپکردن"
              onClick={() => requestAction("print")}
            />
          )}
          {actions.includes("edit") && (
            <ActionBtn
              icon={Pencil}
              label="دەستکاری"
              onClick={() => requestAction("edit")}
            />
          )}
          {actions.includes("change_status") && (
            <ActionBtn
              icon={CheckSquare}
              label="دۆخ"
              onClick={() => requestAction("change_status")}
            />
          )}
          {actions.includes("assign_category") && (
            <ActionBtn
              icon={FolderTree}
              label={t("bulk.category")}
              onClick={() => requestAction("assign_category")}
            />
          )}
          {actions.includes("assign_warehouse") && (
            <ActionBtn
              icon={Warehouse}
              label={t("nav.warehouses")}
              onClick={() => requestAction("assign_warehouse")}
            />
          )}
          {actions.includes("add_tags") && (
            <ActionBtn
              icon={Tags}
              label={t("bulk.tags")}
              onClick={() => requestAction("add_tags")}
            />
          )}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(pendingAction) && !needsExtra}
        title={`${BULK_ACTION_LABELS[pendingAction || ""] || t("bulk.actionFallback")}؟`}
        description={
          destructive
            ? t("bulk.confirmDestructive", { count: selectedIds.length })
            : t("bulk.confirmApply", { count: selectedIds.length })
        }
        confirmText={t("common.confirm")}
        cancelText={t("common.cancel")}
        loading={busy}
        onConfirm={confirmPending}
        onCancel={() => setPendingAction(null)}
      />

      {pendingAction && needsExtra && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-extra-title"
        >
          <div className="rek-dialog w-full max-w-md p-6">
            <h2 id="bulk-extra-title" className="text-xl font-black">
              {BULK_ACTION_LABELS[pendingAction]}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("bulk.records", { count: selectedIds.length })}
            </p>
            <div className="mt-4 space-y-3">
              {pendingAction === "edit" && (
                <label className="block text-sm font-bold">
                  {t("bulk.notes")}
                  <textarea
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-normal focus-visible:ring-[3px] focus-visible:ring-ring/35"
                    rows={3}
                    value={String(payload.fields?.notes || "")}
                    onChange={(e) =>
                      setPayload({
                        fields: { ...payload.fields, notes: e.target.value },
                      })
                    }
                  />
                </label>
              )}
              {pendingAction === "change_status" && (
                <label className="block text-sm font-bold">
                  {t("bulk.status")}
                  <select
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-normal focus-visible:ring-[3px] focus-visible:ring-ring/35"
                    value={
                      payload.status ||
                      (payload.active === false ? "inactive" : "active")
                    }
                    onChange={(e) => {
                      const v = e.target.value;
                      if (["active", "inactive"].includes(v)) {
                        setPayload({ active: v === "active", status: v });
                      } else {
                        setPayload({ status: v });
                      }
                    }}
                  >
                    <option value="active">{t("bulk.active")}</option>
                    <option value="inactive">{t("bulk.inactive")}</option>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="CANCELLED">CANCELLED</option>
                    <option value="DRAFT">DRAFT</option>
                    <option value="VOID">VOID</option>
                  </select>
                </label>
              )}
              {(pendingAction === "assign_category" ||
                pendingAction === "move") && (
                <label className="block text-sm font-bold">
                  {t("bulk.categoryId")}
                  <input
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-normal focus-visible:ring-[3px] focus-visible:ring-ring/35"
                    value={payload.categoryId || ""}
                    onChange={(e) =>
                      setPayload({ categoryId: e.target.value || null })
                    }
                  />
                </label>
              )}
              {pendingAction === "assign_warehouse" && (
                <label className="block text-sm font-bold">
                  {t("bulk.warehouseId")}
                  <input
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-normal focus-visible:ring-[3px] focus-visible:ring-ring/35"
                    value={payload.warehouseId || ""}
                    onChange={(e) =>
                      setPayload({ warehouseId: e.target.value || null })
                    }
                  />
                </label>
              )}
              {pendingAction === "add_tags" && (
                <label className="block text-sm font-bold">
                  {t("bulk.tagsHint")}
                  <input
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-normal focus-visible:ring-[3px] focus-visible:ring-ring/35"
                    value={(payload.tags || []).join(", ")}
                    onChange={(e) =>
                      setPayload({
                        tags: e.target.value
                          .split(",")
                          .map((tag) => tag.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </label>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-xl border border-border px-4 py-2 text-sm font-bold focus-visible:ring-[3px] focus-visible:ring-ring/35"
                onClick={() => setPendingAction(null)}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground focus-visible:ring-[3px] focus-visible:ring-ring/35"
                disabled={busy}
                onClick={confirmPending}
              >
                {t("bulk.applyTo", { count: selectedIds.length })}
              </button>
            </div>
          </div>
        </div>
      )}

      <BulkProgressDialog
        open={progressOpen}
        job={job}
        undoing={undoing}
        onCancelRemaining={() => {
          if (!job) return;
          void cancelBulkJob(job.id).then(setJob);
        }}
        onUndo={() => {
          if (!job) return;
          setUndoing(true);
          void undoBulkJob(job.id)
            .then(() => {
              appToast.success(t("bulk.undoDone"));
              onComplete?.();
            })
            .catch((e) =>
              appToast.error(
                e instanceof Error ? e.message : t("bulk.failed")
              )
            )
            .finally(() => setUndoing(false));
        }}
        onClose={() => {
          setProgressOpen(false);
          setJob(null);
        }}
      />
    </>
  );
}

function ActionBtn({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: typeof Trash2;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-2.5 py-1.5 text-xs font-bold hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/35",
        danger && "border-destructive/40 text-destructive"
      )}
    >
      <Icon size={14} aria-hidden />
      {label}
    </button>
  );
}
