"use client";

import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { inputClassName } from "@/components/ui/FormPrimitives";
import { getPasswordStrength } from "@/lib/utils/passwordStrength";
import { passwordRequirements } from "@/lib/utils/passwordRequirements";

type Props = Omit<React.ComponentProps<"input">, "type"> & {
  label?: string;
  error?: string;
  /** Show the strength meter and the requirement checklist. */
  showStrength?: boolean;
};

export default function PasswordInput({
  label,
  error,
  showStrength = false,
  className,
  value,
  ...props
}: Props) {
  const [visible, setVisible] = useState(false);
  const describedBy = useId();

  const password = typeof value === "string" ? value : "";
  const strength = getPasswordStrength(password);
  const requirements = Object.entries(passwordRequirements(password));

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-bold text-foreground">
          {label}
        </label>
      )}

      <div className="relative">
        <Input
          type={visible ? "text" : "password"}
          value={value}
          className={cn(inputClassName, "h-12 pl-11 pr-3", className)}
          aria-invalid={Boolean(error)}
          aria-describedby={showStrength ? describedBy : undefined}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((prev) => !prev)}
          className="absolute inset-y-0 left-0 flex w-11 items-center justify-center text-muted-foreground transition hover:text-foreground"
          aria-label={visible ? "شاردنەوەی وشەی نهێنی" : "پیشاندانی وشەی نهێنی"}
          aria-pressed={visible}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      {showStrength && password ? (
        <div id={describedBy} className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full transition-all", strength.color)}
                style={{ width: `${(strength.score / 5) * 100}%` }}
              />
            </div>
            <span className="text-xs font-bold text-muted-foreground">
              {strength.label}
            </span>
          </div>

          <ul className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
            {requirements.map(([key, rule]) => (
              <li
                key={key}
                className={cn(
                  "flex items-center gap-1.5",
                  rule.valid && "text-[var(--success)]"
                )}
              >
                <span aria-hidden>{rule.valid ? "✓" : "•"}</span>
                {rule.text}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
