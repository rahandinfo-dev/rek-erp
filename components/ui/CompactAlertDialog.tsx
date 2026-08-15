"use client";

import * as React from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { cn } from "@/lib/utils";

type Props = React.ComponentProps<typeof AlertDialog.Content>;

/** Shared compact overlay surface for recovery and unsaved-change decisions. */
export function CompactAlertDialogContent({
  className,
  children,
  style,
  ...props
}: Props) {
  return (
    <AlertDialog.Portal>
      <AlertDialog.Overlay className="fixed inset-0 z-[100] bg-[var(--overlay)] backdrop-blur-[2px] animate-in fade-in duration-200" />
      <div className="rek-compact-alert-viewport">
        <AlertDialog.Content
          dir="rtl"
          {...props}
          style={{
            ...style,
            position: "relative",
            width: "min(420px, calc(100vw - 32px))",
            maxWidth: "420px",
            height: "auto",
            minWidth: 0,
            flex: "none",
            gridColumn: "auto",
            alignSelf: "center",
            justifySelf: "center",
          }}
          className={cn("rek-compact-alert-dialog", className)}
        >
          {children}
        </AlertDialog.Content>
      </div>
    </AlertDialog.Portal>
  );
}
