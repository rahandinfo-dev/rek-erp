"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useLayoutEffect, useState, useSyncExternalStore, type CSSProperties, type ReactNode, type RefObject } from "react";

type Props = { anchorRef: RefObject<HTMLElement | null>; children: ReactNode; className?: string; gap?: number; minWidth?: number };

/** A viewport-aware portal for menus nested in tables, cards, and dialogs. */
export function FloatingLayer({ anchorRef, children, className, gap = 6, minWidth = 220 }: Props) {
  const mounted = useSyncExternalStore(() => () => undefined, () => true, () => false);
  const [layer, setLayer] = useState<HTMLDivElement | null>(null);
  const [style, setStyle] = useState<CSSProperties>({ visibility: "hidden" });

  const position = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor || !layer) return;
    const rect = anchor.getBoundingClientRect();
    const viewport = window.visualViewport;
    const viewportWidth = viewport?.width ?? window.innerWidth;
    const viewportHeight = viewport?.height ?? window.innerHeight;
    const viewportLeft = viewport?.offsetLeft ?? 0;
    const viewportTop = viewport?.offsetTop ?? 0;
    const gutter = 8;
    const width = Math.min(Math.max(rect.width, minWidth), viewportWidth - gutter * 2);
    const below = viewportTop + viewportHeight - rect.bottom - gap - gutter;
    const above = rect.top - viewportTop - gap - gutter;
    const naturalHeight = layer.scrollHeight;
    const placeAbove = naturalHeight > below && above > below;
    const maxHeight = Math.max(96, placeAbove ? above : below);
    const left = Math.min(Math.max(rect.left, viewportLeft + gutter), viewportLeft + viewportWidth - width - gutter);
    const top = placeAbove ? Math.max(viewportTop + gutter, rect.top - gap - Math.min(naturalHeight, maxHeight)) : rect.bottom + gap;
    setStyle({ left, top, width, maxHeight, visibility: "visible" });
  }, [anchorRef, gap, layer, minWidth]);

  useLayoutEffect(position, [children, position]);
  useEffect(() => {
    if (!mounted) return;
    const refresh = () => window.requestAnimationFrame(position);
    window.addEventListener("resize", refresh);
    window.addEventListener("scroll", refresh, true);
    window.visualViewport?.addEventListener("resize", refresh);
    window.visualViewport?.addEventListener("scroll", refresh);
    return () => {
      window.removeEventListener("resize", refresh);
      window.removeEventListener("scroll", refresh, true);
      window.visualViewport?.removeEventListener("resize", refresh);
      window.visualViewport?.removeEventListener("scroll", refresh);
    };
  }, [mounted, position]);

  if (!mounted) return null;
  return createPortal(<div ref={setLayer} className={className} data-slot="floating-layer" style={style}>{children}</div>, document.body);
}
