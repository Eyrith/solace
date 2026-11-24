import * as React from "react";
import { cn } from "@/lib/utils";

export interface SectionRuleProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: React.ReactNode;
}

/**
 * Hairline separator rule with optional centered label.
 */
export function SectionRule({ label, className, ...props }: SectionRuleProps) {
  if (label) {
    return (
      <div
        role="separator"
        className={cn("relative flex items-center my-6", className)}
        {...props}
      >
        <div className="flex-grow border-t border-[var(--border)]" />
        <span className="shrink-0 px-3 text-xs text-[var(--muted-foreground)] select-none">
          {label}
        </span>
        <div className="flex-grow border-t border-[var(--border)]" />
      </div>
    );
  }

  return (
    <div
      role="separator"
      className={cn("border-t border-[var(--border)] my-6", className)}
      {...props}
    />
  );
}
