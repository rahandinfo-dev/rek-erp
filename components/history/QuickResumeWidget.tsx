"use client";

import { RotateCcw } from "lucide-react";
import { useNavigationHistory } from "@/lib/history/provider";
import {
  HISTORY_MODULE_LABELS,
  relativeOpened,
} from "@/lib/history/types";

/** One-click return to last workspace position (tab/filters/page). */
export default function QuickResumeWidget() {
  const { workspace, resumeWorkspace } = useNavigationHistory();

  if (!workspace || workspace.pathname === "/dashboard") {
    return (
      <section aria-label="Quick Resume" className="rek-card p-5">
        <div className="mb-2 flex items-center gap-2">
          <RotateCcw size={18} className="text-primary" />
          <h2 className="text-lg font-black">Quick Resume</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Your last filters, tabs, and page will appear here after you work in
          a module.
        </p>
      </section>
    );
  }

  const moduleKey = workspace.pathname.split("/")[2] || "general";
  const filterCount = Object.keys(workspace.filters || {}).length;

  return (
    <section aria-label="Quick Resume" className="rek-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <RotateCcw size={18} className="text-primary" />
        <h2 className="text-lg font-black">Quick Resume</h2>
      </div>
      <p className="truncate text-sm font-bold text-foreground">
        {HISTORY_MODULE_LABELS[moduleKey] || moduleKey}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {[
          workspace.tab ? `Tab ${workspace.tab}` : null,
          filterCount ? `${filterCount} filters` : null,
          workspace.sort ? `Sort ${workspace.sort}` : null,
          workspace.page ? `Page ${workspace.page}` : null,
          relativeOpened(workspace.updatedAt),
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>
      <button
        type="button"
        onClick={() => resumeWorkspace()}
        className="mt-4 inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"
      >
        Resume last position
      </button>
    </section>
  );
}
