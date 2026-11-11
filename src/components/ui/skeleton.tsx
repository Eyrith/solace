import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Layout-preserving placeholder skeleton respecting reduced-motion preferences.
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "rounded-[var(--ds-radius)] bg-[var(--muted)] animate-pulse",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Geometry-matched skeleton for editorial article cards to prevent CLS.
 */
export function EditorialCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] p-5 space-y-3"
    >
      <div className="flex gap-3">
        <Skeleton className="h-3.5 w-20" />
        <Skeleton className="h-3.5 w-16" />
      </div>
      <Skeleton className="h-6 w-4/5" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <div className="pt-2 flex justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
  );
}

/**
 * Geometry-matched skeleton for private messaging bubbles.
 */
export function ChatStreamSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-4">
      <div className="flex justify-start">
        <Skeleton className="h-16 w-3/5 rounded-2xl" />
      </div>
      <div className="flex justify-end">
        <Skeleton className="h-12 w-1/2 rounded-2xl" />
      </div>
      <div className="flex justify-start">
        <Skeleton className="h-20 w-2/3 rounded-2xl" />
      </div>
    </div>
  );
}

