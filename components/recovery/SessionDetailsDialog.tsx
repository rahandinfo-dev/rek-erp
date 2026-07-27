"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MODULE_LABELS,
  formatBytes,
  relativeTime,
  type SessionRecord,
} from "@/lib/recovery/types";
import { useT } from "@/components/i18n/LocaleProvider";

type Props = {
  open: boolean;
  session: SessionRecord | null;
  onClose: () => void;
  onContinue: () => void;
};

export default function SessionDetailsDialog({
  open,
  session,
  onClose,
  onContinue,
}: Props) {
  const { t } = useT();
  if (!session) return null;
  const s = session.summary;
  const label =
    session.title || s.moduleLabel || MODULE_LABELS[session.moduleKey];

  const draftStatusLabel =
    s.draftStatus === "draft"
      ? t("recovery.statusDraft")
      : s.draftStatus === "partial"
        ? t("recovery.statusPartial")
        : s.draftStatus === "empty"
          ? t("recovery.statusEmpty")
          : s.draftStatus;

  const bullets: string[] = [];
  if (s.fieldsChanged)
    bullets.push(
      s.fieldsChanged === 1
        ? t("recovery.fieldsChangedOne")
        : t("recovery.fieldsChanged", { count: s.fieldsChanged })
    );
  if (s.hasWarehouse) bullets.push(t("recovery.warehouseSelected"));
  if (s.hasCustomer) bullets.push(t("recovery.customerSelected"));
  if (s.hasSupplier) bullets.push(t("recovery.supplierSelected"));
  if (s.hasEmployee) bullets.push(t("recovery.employeeSelected"));
  if (s.hasImage) bullets.push(t("recovery.imageUploaded"));
  if (s.itemCount)
    bullets.push(t("recovery.lineItems", { count: s.itemCount }));
  bullets.push(...(s.notes || []));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("recovery.sessionDetails")}</DialogTitle>
          <DialogDescription>
            {t("recovery.sessionDetailsDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <p>
            <span className="font-bold text-foreground">
              {t("recovery.module")}:
            </span>{" "}
            {label}
          </p>
          <p>
            <span className="font-bold text-foreground">
              {t("recovery.lastEdited")}:
            </span>{" "}
            {relativeTime(session.lastEditedAt)}
          </p>
          <p>
            <span className="font-bold text-foreground">
              {t("recovery.lastSaved")}:
            </span>{" "}
            {relativeTime(session.lastSavedAt)}
          </p>
          <p>
            <span className="font-bold text-foreground">
              {t("recovery.draftStatus")}:
            </span>{" "}
            {draftStatusLabel}
          </p>
          <p>
            <span className="font-bold text-foreground">
              {t("recovery.size")}:
            </span>{" "}
            {formatBytes(session.sizeBytes)}
          </p>
          <p>
            <span className="font-bold text-foreground">
              {t("recovery.estimatedRecovery")}:
            </span>{" "}
            {t("recovery.estimatedSeconds", {
              count: Math.max(1, Math.round(s.estimatedMs / 1000)),
            })}
          </p>
          {bullets.length ? (
            <ul className="list-disc space-y-1 ps-5 text-muted-foreground">
              {bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          ) : null}
          <p className="text-xs text-muted-foreground">
            {t("recovery.path")}: {session.pathname}
            {session.search}
          </p>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row-reverse sm:justify-start">
          <button
            type="button"
            onClick={onContinue}
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-primary px-5 text-sm font-bold text-primary-foreground"
          >
            {t("recovery.continueEditing")}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-border bg-card px-5 text-sm font-bold text-foreground"
          >
            {t("common.close")}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
