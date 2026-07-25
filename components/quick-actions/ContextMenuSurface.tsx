"use client";

import type { ElementType, HTMLAttributes, ReactNode } from "react";
import { useQuickActionsOptional } from "@/lib/quick-actions/provider";
import type { QuickActionRecord } from "@/lib/quick-actions/types";

type Props = {
  record: QuickActionRecord;
  as?: ElementType;
  children: ReactNode;
  className?: string;
} & Omit<HTMLAttributes<HTMLElement>, "children" | "className">;

/** Additive surface for right-click / long-press context menu. */
export default function ContextMenuSurface({
  record,
  as: Comp = "div",
  children,
  className,
  ...rest
}: Props) {
  const qa = useQuickActionsOptional();
  const bind = qa ? qa.bindContextMenu(record) : null;

  return (
    <Comp
      className={className}
      tabIndex={0}
      onContextMenu={bind?.onContextMenu}
      onTouchStart={bind?.onTouchStart}
      onTouchEnd={bind?.onTouchEnd}
      onTouchMove={bind?.onTouchMove}
      onFocus={bind?.onFocus}
      {...rest}
    >
      {children}
    </Comp>
  );
}
