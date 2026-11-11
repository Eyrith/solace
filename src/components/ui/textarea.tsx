"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

/**
 * Accessible multiline text area respecting minimum 16px mobile typography and focus rings.
 */
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "flex min-h-[104px] w-full rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)]",
          "px-3.5 py-2.5 text-base sm:text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] leading-relaxed",
          "transition-colors duration-150",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]",
          "aria-[invalid=true]:border-[var(--destructive)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

