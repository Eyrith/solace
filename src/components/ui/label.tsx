"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

/**
 * Explicit visible field label (never use placeholder text as a substitute for labels).
 */
export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1 text-sm font-medium text-[var(--foreground)] leading-snug",
          className,
        )}
        {...props}
      >
        <span>{children}</span>
        {required && (
          <span className="text-[var(--destructive)]" aria-hidden="true">
            *
          </span>
        )}
      </label>
    );
  },
);
Label.displayName = "Label";

