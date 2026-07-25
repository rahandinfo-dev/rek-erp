"use client";

import { useMemo } from "react";
import BulkActionBar from "@/components/bulk/BulkActionBar";
import SelectionQuickActions from "@/components/quick-actions/SelectionQuickActions";
import { useBulkSelection } from "@/lib/bulk/useSelection";
import type { BulkModule } from "@/lib/bulk/types";
import type { QuickActionRecord } from "@/lib/quick-actions/types";

type Props = {
  moduleKey: BulkModule;
  ids: string[];
  /** Optional labels for selection toolbar */
  labels?: Record<string, string>;
  getRecord?: (id: string) => Partial<QuickActionRecord> | null;
  children: (ctx: {
    selectedIds: string[];
    isSelected: (id: string) => boolean;
    toggle: (id: string) => void;
    headerCheckbox: React.ReactNode;
  }) => React.ReactNode;
};

/** Lightweight bulk shell for custom (non-DataTable) lists. */
export default function BulkListShell({
  moduleKey,
  ids,
  labels,
  getRecord,
  children,
}: Props) {
  const selection = useBulkSelection();
  const allIds = useMemo(() => ids, [ids]);

  const headerCheckbox = (
    <input
      type="checkbox"
      checked={
        allIds.length > 0 && allIds.every((id) => selection.isSelected(id))
      }
      onChange={() => {
        if (allIds.every((id) => selection.isSelected(id))) {
          selection.deselectAll();
        } else {
          selection.selectAll(allIds);
        }
      }}
      aria-label="Select all visible"
      className="focus-visible:ring-[3px] focus-visible:ring-ring/35"
    />
  );

  return (
    <div className="space-y-3">
      <SelectionQuickActions
        moduleKey={moduleKey}
        selectedIds={selection.selectedIds}
        labels={labels}
        getRecord={getRecord}
      />
      <BulkActionBar
        moduleKey={moduleKey}
        selectedIds={selection.selectedIds}
        pageIds={allIds}
        filteredIds={allIds}
        allIds={allIds}
        onSelectPage={() => selection.selectPage(allIds)}
        onSelectFiltered={() => selection.selectFiltered(allIds)}
        onSelectAll={() => selection.selectAll(allIds)}
        onDeselectAll={selection.deselectAll}
      />
      {children({
        selectedIds: selection.selectedIds,
        isSelected: selection.isSelected,
        toggle: selection.toggle,
        headerCheckbox,
      })}
    </div>
  );
}
