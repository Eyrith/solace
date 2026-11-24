"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Standardized PageHeader component for consistent hierarchy across
 * both private sanctuary and editorial pages.
 */
export function PageHeader({
  title,
  description,
  eyebrow,
  backHref,
  backLabel = "Back",
  action,
  children,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("border-b border-[var(--border)] pb-6 space-y-4", className)}>
      {(backHref || action) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {backHref ? (
            <Link
              href={backHref}
              className="inline-flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{backLabel}</span>
            </Link>
          ) : (
            <div />
          )}

          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
      )}

      <div className="space-y-1.5">
        {eyebrow && (
          <p className="text-xs font-serif italic text-[var(--muted-foreground)]">{eyebrow}</p>
        )}
        <h1 className="font-[family-name:var(--ds-font-display)] text-2xl sm:text-3xl font-bold tracking-tight text-[var(--foreground)]">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-[var(--muted-foreground)] leading-relaxed max-w-2xl">
            {description}
          </p>
        )}
      </div>

      {children}
    </header>
  );
}
