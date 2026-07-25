"use client";

import { useMemo } from "react";
import QuickActionsToolbar from "@/components/quick-actions/QuickActionsToolbar";
import { useQuickActionsOptional } from "@/lib/quick-actions/provider";
import { entityTypeFor } from "@/lib/bulk/modules";
import {
  editHrefFor,
  viewHrefFor,
} from "@/lib/quick-actions/urls";
import type { QuickActionRecord } from "@/lib/quick-actions/types";

type Props = {
  moduleKey: string;
  selectedIds: string[];
  /** Optional label map id → label */
  labels?: Record<string, string>;
  getRecord?: (id: string) => Partial<QuickActionRecord> | null;
  className?: string;
};

export default function SelectionQuickActions({
  moduleKey,
  selectedIds,
  labels,
  getRecord,
  className,
}: Props) {
  const qa = useQuickActionsOptional();

  const records = useMemo<QuickActionRecord[]>(() => {
    return selectedIds.map((id) => {
      const extra = getRecord?.(id) || {};
      return {
        id,
        moduleKey,
        label: extra.label || labels?.[id] || id.slice(0, 8),
        href: extra.href || viewHrefFor(moduleKey, id),
        editHref: extra.editHref || editHrefFor(moduleKey, id),
        entityType: extra.entityType || entityTypeFor(moduleKey),
        deleted: extra.deleted,
        archived: extra.archived,
        pinned: extra.pinned,
        meta: extra.meta,
      };
    });
  }, [selectedIds, moduleKey, labels, getRecord]);

  if (!qa || selectedIds.length === 0) return null;

  return (
    <QuickActionsToolbar
      moduleKey={moduleKey}
      records={records}
      prefs={qa.prefs}
      onAction={(id) => void qa.runAction(id, records, moduleKey)}
      onPrefsChange={qa.updatePrefs}
      onResetPrefs={qa.resetPrefs}
      className={className}
    />
  );
}
