"use client";

import { useCallback, useMemo, useState } from "react";

export function useBulkSelection() {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const selectedIds = useMemo(() => [...selected], [selected]);
  const count = selected.size;

  const isSelected = useCallback((id: string) => selected.has(id), [selected]);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelected(new Set(ids));
  }, []);

  const selectPage = useCallback((ids: string[]) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.add(id);
      return next;
    });
  }, []);

  const selectFiltered = useCallback((ids: string[]) => {
    setSelected(new Set(ids));
  }, []);

  const deselectAll = useCallback(() => setSelected(new Set()), []);

  const setIds = useCallback((ids: string[]) => {
    setSelected(new Set(ids));
  }, []);

  return {
    selected,
    selectedIds,
    count,
    isSelected,
    toggle,
    selectAll,
    selectPage,
    selectFiltered,
    deselectAll,
    setIds,
  };
}
