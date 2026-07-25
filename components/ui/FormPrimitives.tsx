"use client";

import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rek-card p-4 sm:p-8", className)}>
      {(title || description) && (
        <div className="mb-6">
          {title && (
            <h2 className="text-lg font-black text-foreground sm:text-xl">
              {title}
            </h2>
          )}
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

export function FormField({
  label,
  error,
  children,
  hint,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-bold text-foreground">{label}</label>
      {children}
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {error && (
        <p className="flex items-center gap-1 text-sm text-destructive">
          <AlertCircle size={14} />
          {error}
        </p>
      )}
    </div>
  );
}

export function FormAlert({
  type,
  message,
}: {
  type: "error" | "success";
  message: string;
}) {
  if (!message) return null;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-2xl border p-4 text-sm",
        type === "error"
          ? "border-destructive/25 bg-[color-mix(in_srgb,var(--destructive)_8%,white)] text-destructive"
          : "border-success/25 bg-[color-mix(in_srgb,var(--success)_10%,white)] text-success"
      )}
    >
      {type === "error" ? (
        <AlertCircle size={18} className="mt-0.5 shrink-0" />
      ) : (
        <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
      )}
      <span>{message}</span>
    </div>
  );
}

export function FormSubmitButton({
  loading,
  children,
  disabled,
  className,
}: {
  loading?: boolean;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Button
      type="submit"
      size="lg"
      disabled={disabled || loading}
      className={className}
    >
      {loading && <Loader2 size={18} className="animate-spin" />}
      {children}
    </Button>
  );
}

export const inputClassName =
  "rek-input";

export const textareaClassName =
  "min-h-28 w-full rounded-xl border border-input bg-background p-4 text-sm text-foreground outline-none transition hover:border-primary/35 focus:border-ring focus:ring-[3px] focus:ring-ring/30";

export const selectClassName = inputClassName;
