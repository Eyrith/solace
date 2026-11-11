"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PublicationSummary {
  slug: string;
  name: string;
  focus: string;
  websiteUrl: string;
  curatedCount: number;
}

export interface PublicationCardProps {
  publication: PublicationSummary;
  href?: string;
  className?: string;
}

/**
 * Clean publisher directory card explicitly crediting external publications.
 */
export function PublicationCard({ publication, href, className }: PublicationCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col justify-between rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] p-5",
        className,
      )}
    >
      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-[family-name:var(--ds-font-display)] text-lg font-semibold text-[var(--foreground)]">
            {href ? (
              <Link href={href} className="hover:underline underline-offset-4">
                {publication.name}
              </Link>
            ) : (
              publication.name
            )}
          </h3>
          <span className="text-xs text-[var(--muted-foreground)] tabular-nums">
            {publication.curatedCount} essays
          </span>
        </div>
        <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">{publication.focus}</p>
      </div>

      <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs">
        {href ? (
          <Link
            href={href}
            className="font-medium text-[var(--foreground)] hover:underline underline-offset-4"
          >
            Browse curated essays
          </Link>
        ) : (
          <span />
        )}
        <a
          href={publication.websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <span>Publisher site</span>
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}

