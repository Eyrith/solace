"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const iconButtonVariants = cva(
  [
    "inline-flex items-center justify-center shrink-0 rounded-[var(--ds-radius)]",
    "cursor-pointer select-none transition-colors duration-150 ease-out",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]",
    "disabled:pointer-events-none disabled:opacity-50 touch-manipulation",
  ].join(" "),
  {
    variants: {
      variant: {
        ghost:
          "bg-transparent text-[var(--muted-foreground)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]",
        outline:
          "border border-[var(--border)] bg-transparent text-[var(--foreground)] hover:bg-[var(--surface-2)]",
        subtle:
          "bg-[var(--surface-2)] text-[var(--foreground)] hover:bg-[var(--muted)]",
        primary:
          "bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary)]/90 shadow-xs",
        destructive:
          "bg-[var(--destructive)] text-[var(--destructive-foreground)] hover:bg-[var(--destructive)]/90 shadow-xs",
      },
      size: {
        md: "h-10 w-10 min-h-10 min-w-10",
        lg: "h-11 w-11 min-h-11 min-w-11",
      },
    },
    defaultVariants: {
      variant: "ghost",
      size: "md",
    },
  },
);

export interface IconButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "aria-label">,
    VariantProps<typeof iconButtonVariants> {
  /**
   * Mandatory descriptive accessible label for assistive tech.
   */
  "aria-label": string;
  asChild?: boolean;
  isLoading?: boolean;
}

/**
 * Accessible Icon Button primitive enforcing mandatory `aria-label`
 * and standard touch targets (40px / 44px).
 */
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      isLoading = false,
      disabled,
      children,
      "aria-label": ariaLabel,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";

    if (asChild) {
      return (
        <Comp
          ref={ref}
          aria-label={ariaLabel}
          className={cn(iconButtonVariants({ variant, size, className }))}
          {...props}
        >
          {children}
        </Comp>
      );
    }

    return (
      <button
        ref={ref}
        type="button"
        aria-label={ariaLabel}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        className={cn(iconButtonVariants({ variant, size, className }))}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden="true" />
        ) : (
          children
        )}
      </button>
    );
  },
);
IconButton.displayName = "IconButton";
