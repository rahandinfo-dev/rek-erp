"use client";

import dynamic from "next/dynamic";

const VersionHistoryPanel = dynamic(
  () => import("@/components/versions/VersionHistoryPanel"),
  {
    ssr: false,
    loading: () => (
      <p className="text-sm text-muted-foreground">بارکردنی مێژووی وەشان…</p>
    ),
  }
);

/** Additive History section for record detail / edit pages. */
export default function RecordVersionHistorySection({
  entityType,
  entityId,
  recordLabel,
}: {
  entityType: string;
  entityId: string;
  recordLabel?: string;
}) {
  return (
    <div className="rek-card mt-6 space-y-2 p-4 sm:p-6">
      <VersionHistoryPanel
        entityType={entityType}
        entityId={entityId}
        recordLabel={recordLabel}
      />
    </div>
  );
}
