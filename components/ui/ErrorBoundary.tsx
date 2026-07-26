"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { monitorError } from "@/lib/production/monitor";

type Props = {
  children: ReactNode;
  fallbackTitle?: string;
  area?: string;
};

type State = { error: Error | null };

/**
 * Catches render crashes so the shell stays usable.
 * Does not change business logic — recovery UI only.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    monitorError(this.props.area || "ui.error-boundary", error, {
      meta: { componentStack: info.componentStack?.slice(0, 500) },
    });
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div
        role="alert"
        className="rek-card mx-auto flex max-w-lg flex-col items-center gap-4 p-8 text-center"
      >
        <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertTriangle size={24} aria-hidden />
        </div>
        <div>
          <h2 className="text-lg font-black">
            {this.props.fallbackTitle || "هەڵەیەک ڕوویدا"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            پەڕەکە تێکچوو. زانیارییەکانت پارێزراون — دووبارە هەوڵبدەرەوە یان ئەم بەشە بار بکەرەوە.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => this.setState({ error: null })}
          >
            دووبارە هەوڵبدەرەوە
          </Button>
          <Button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") window.location.reload();
            }}
          >
            <RefreshCw size={16} aria-hidden />
            بارکردنەوە
          </Button>
        </div>
      </div>
    );
  }
}
