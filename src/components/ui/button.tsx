"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium",
    "rounded-[var(--ds-radius)] cursor-pointer select-none",
    "transition-[background-color,border-color,color,transform,opacity] duration-150 ease-out",
    "active:scale-[0.985] disabled:pointer-events-none disabled:opacity-50",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]",
    "touch-manipulation",
  ].join(" "),
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-92 shadow-xs",
        secondary:
          "bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:opacity-90",
        outline:
          "border border-[var(--border)] bg-transparent text-[var(--foreground)] hover:bg-[var(--muted)]",
        ghost:
          "bg-transparent text-[var(--foreground)] hover:bg-[var(--muted)]",
        subtle:
          "bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--secondary)]",
        destructive:
          "bg-[var(--destructive)] text-[var(--destructive-foreground)] hover:opacity-92 shadow-xs",
      },
      size: {
        sm: "min-h-11 sm:min-h-9 px-3.5 text-sm",
        md: "min-h-11 sm:min-h-10 px-4 py-2 text-sm",
        lg: "min-h-12 px-6 py-2.5 text-base",
        icon: "min-h-11 min-w-11 sm:min-h-10 sm:min-w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
  loadingText?: string;
}

/**
 * Accessible button primitive enforcing >=44px mobile touch targets,
 * visible focus outlines, and async loading feedback.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      isLoading = false,
      loadingText,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";

    if (asChild) {
      return (
        <Comp
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        >
          {children}
        </Comp>
      );
    }

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden="true" />}
        {isLoading && loadingText ? <span>{loadingText}</span> : children}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };

