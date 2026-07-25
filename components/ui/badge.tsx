import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("rek-badge", {
  variants: {
    variant: {
      primary: "rek-badge-primary",
      success: "rek-badge-success",
      warning: "rek-badge-warning",
      danger: "rek-badge-danger",
      muted: "rek-badge-muted",
    },
  },
  defaultVariants: {
    variant: "primary",
  },
});

export type BadgeProps = React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants>;

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
