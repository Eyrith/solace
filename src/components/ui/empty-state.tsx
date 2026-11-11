"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

/**
 * Calm, purposeful empty state inviting the user toward one clear next action.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center rounded-[var(--ds-radius)]",
        "border border-dashed border-[var(--border)] bg-[var(--card)]/50 px-6 py-12",
        className,
      )}
    >
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--muted)] text-[var(--muted-foreground)]">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <h3 className="font-[family-name:var(--ds-font-display)] text-lg font-medium text-[var(--foreground)]">
        {title}
      </h3>
      <p className="mt-1.5 max-w-md text-sm text-[var(--muted-foreground)] leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button type="button" variant="primary" size="md" onClick={onAction} className="mt-5">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

