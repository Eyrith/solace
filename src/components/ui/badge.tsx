import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium leading-tight whitespace-nowrap transition-colors",
  {
    variants: {
      variant: {
        neutral: "bg-[var(--muted)] text-[var(--foreground)] border border-[var(--border)]",
        primary: "bg-[var(--primary)] text-[var(--primary-foreground)]",
        outline: "border border-[var(--border)] text-[var(--muted-foreground)] bg-transparent",
        success: "bg-[var(--success)] text-[var(--success-foreground)]",
        warning: "bg-[var(--warning)] text-[var(--warning-foreground)]",
        destructive: "bg-[var(--destructive)] text-[var(--destructive-foreground)]",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

/**
 * Semantic status pill maintaining >=12px minimum readable typography.
 */
export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

