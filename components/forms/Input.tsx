"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { inputClassName } from "@/components/ui/FormPrimitives";

type Props = React.ComponentProps<"input"> & {
  label?: string;
  error?: string;
};

export default function FormInput({
  label,
  error,
  className,
  ...props
}: Props) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-bold text-foreground">{label}</label>
      )}
      <Input className={cn(inputClassName, "h-12", className)} {...props} />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

export { Input };
