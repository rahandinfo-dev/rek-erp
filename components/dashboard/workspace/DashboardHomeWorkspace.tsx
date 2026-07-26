"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDraftOwner } from "@/lib/drafts/owner";
import { DashboardWorkspaceProvider, useDashboardWorkspace } from "@/lib/dashboard/workspace/provider";
import type { WidgetInstance, WidgetSize } from "@/lib/dashboard/workspace/types";
import DashboardToolbar from "@/components/dashboard/workspace/DashboardToolbar";
import WidgetShell from "@/components/dashboard/workspace/WidgetShell";
import WidgetRenderer, {
  type DashboardHomeData,
} from "@/components/dashboard/workspace/WidgetRenderer";
import { LowStockWarningBanner } from "@/components/inventory/LowStockWarningBanner";
import SalaryAlertsWatcher from "@/components/employees/SalaryAlertsWatcher";
import { PageHeader } from "@/components/ui/PageHeader";
import { cn } from "@/lib/utils";

const SIZE_CLASS: Record<WidgetSize, string> = {
  small: "col-span-12 sm:col-span-6 xl:col-span-3",
  medium: "col-span-12 sm:col-span-6 xl:col-span-4",
  large: "col-span-12 xl:col-span-6",
  xlarge: "col-span-12",
};

function SortableWidget({
  instance,
  data,
  tick,
  onRefresh,
}: {
  instance: WidgetInstance;
  data: DashboardHomeData;
  tick: number;
  onRefresh: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: instance.id,
      disabled: instance.pinned,
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("min-w-0", SIZE_CLASS[instance.size])}
    >
      <WidgetShell
        instance={instance}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
        onRefresh={onRefresh}
      >
        <div key={`${instance.id}-${tick}`}>
          <WidgetRenderer instance={instance} data={data} />
        </div>
      </WidgetShell>
    </div>
  );
}

function WorkspaceGrid({
  data,
  userName,
}: {
  data: DashboardHomeData;
  userName: string;
}) {
  const { active, editMode, reorderWidgets, ready } = useDashboardWorkspace();
  const [tick, setTick] = useState(0);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const visible = useMemo(() => {
    const list = (active?.widgets || []).filter((w) => !w.hidden);
    return [...list].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
      return a.order - b.order;
    });
  }, [active]);

  function onDragEnd(event: DragEndEvent) {
    const { active: a, over } = event;
    if (!over || a.id === over.id) return;
    const ids = visible.map((w) => w.id);
    const oldIndex = ids.indexOf(String(a.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(ids, oldIndex, newIndex);
    reorderWidgets(next);
  }

  return (
    <div className="space-y-6 sm:space-y-7">
      <SalaryAlertsWatcher />

      <PageHeader
        title="داشبۆرد"
        description={`سڵاو، ${userName} — ئەوەی ئەمڕۆ پێویستە بیزانیت.`}
      />

      <DashboardToolbar />

      <LowStockWarningBanner
        lowStockCount={data.summary.lowStockCount}
        outOfStockCount={data.summary.outOfStockCount}
      />

      {!ready ? (
        <div className="grid grid-cols-12 gap-4">
          <div className="rek-skeleton col-span-12 h-40 rounded-3xl sm:col-span-6 xl:col-span-3" />
          <div className="rek-skeleton col-span-12 h-40 rounded-3xl sm:col-span-6 xl:col-span-3" />
          <div className="rek-skeleton col-span-12 h-40 rounded-3xl sm:col-span-6 xl:col-span-3" />
          <div className="rek-skeleton col-span-12 h-40 rounded-3xl sm:col-span-6 xl:col-span-3" />
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={visible.map((w) => w.id)}
            strategy={rectSortingStrategy}
          >
            <div
              className={cn(
                "grid grid-cols-12 gap-3 sm:gap-4",
                editMode && "rounded-3xl border border-dashed border-primary/30 p-2 sm:p-3"
              )}
            >
              {visible.map((instance) => (
                <SortableWidget
                  key={instance.id}
                  instance={instance}
                  data={data}
                  tick={tick}
                  onRefresh={() => setTick((t) => t + 1)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

export default function DashboardHomeWorkspace({
  data,
  userName,
}: {
  data: DashboardHomeData;
  userName: string;
}) {
  const owner = useDraftOwner();

  return (
    <DashboardWorkspaceProvider
      userId={owner.userId}
      companyId={owner.companyId}
    >
      <WorkspaceGrid data={data} userName={userName} />
    </DashboardWorkspaceProvider>
  );
}
