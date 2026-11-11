"use client";

import * as React from "react";
import { ArrowUpRight, Bookmark, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface EditorialArticle {
  id: string;
  title: string;
  author?: string;
  publication: string;
  publishedAt: string;
  description: string;
  originalUrl: string;
  category: string;
  readingDurationMinutes?: number;
}

export interface ArticleCardProps {
  article: EditorialArticle;
  variant?: "featured" | "standard" | "row";
  isSaved?: boolean;
  onToggleSave?: (id: string) => void;
  onOpenArticle?: (article: EditorialArticle) => void;
  className?: string;
}

/**
 * Editorial article presentation built around typography, strict attribution,
 * outbound canonical links, and clutter-free reading hierarchy.
 */
export function ArticleCard({
  article,
  variant = "standard",
  isSaved = false,
  onToggleSave,
  onOpenArticle,
  className,
}: ArticleCardProps) {
  const handleOutboundClick = () => {
    onOpenArticle?.(article);
  };

  if (variant === "row") {
    return (
      <article
        className={cn(
          "group py-4 border-b border-[var(--border)] last:border-b-0 flex flex-col gap-2",
          className,
        )}
      >
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-[var(--muted-foreground)]">
          <span className="font-semibold text-[var(--foreground)]">{article.publication}</span>
          <span>{article.category}</span>
          {article.readingDurationMinutes && (
            <span className="tabular-nums">{article.readingDurationMinutes} min read</span>
          )}
        </div>

        <div className="flex items-start justify-between gap-3">
          <a
            href={article.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleOutboundClick}
            className="font-[family-name:var(--ds-font-display)] text-lg font-medium leading-snug text-[var(--foreground)] hover:underline underline-offset-4"
          >
            {article.title}
          </a>
          {onToggleSave && (
            <button
              type="button"
              onClick={() => onToggleSave(article.id)}
              aria-pressed={isSaved}
              aria-label={isSaved ? `Remove ${article.title} from saved` : `Save ${article.title}`}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--ds-radius)] text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer"
            >
              {isSaved ? (
                <Check className="h-4 w-4 text-[var(--primary)]" aria-hidden="true" />
              ) : (
                <Bookmark className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          )}
        </div>

        <p className="text-sm text-[var(--muted-foreground)] line-clamp-2 max-w-[68ch] leading-relaxed">
          {article.description}
        </p>

        <div className="text-xs text-[var(--muted-foreground)] flex flex-wrap gap-x-3">
          {article.author && <span>By {article.author}</span>}
          <time dateTime={article.publishedAt}>{article.publishedAt}</time>
        </div>
      </article>
    );
  }

  const isFeatured = variant === "featured";

  return (
    <article
      className={cn(
        "flex flex-col justify-between rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)]",
        isFeatured ? "p-6 sm:p-8" : "p-5",
        className,
      )}
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--muted-foreground)]">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-semibold text-[var(--foreground)]">{article.publication}</span>
            <span>{article.category}</span>
          </div>
          {article.readingDurationMinutes && (
            <span className="tabular-nums">{article.readingDurationMinutes} min read</span>
          )}
        </div>

        <h2
          className={cn(
            "font-[family-name:var(--ds-font-display)] font-semibold tracking-tight text-[var(--foreground)]",
            isFeatured ? "text-2xl sm:text-4xl leading-[1.15]" : "text-xl leading-snug",
          )}
        >
          <a
            href={article.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleOutboundClick}
            className="hover:underline underline-offset-4 decoration-[var(--border)]"
          >
            {article.title}
          </a>
        </h2>

        <p
          className={cn(
            "text-[var(--muted-foreground)] leading-relaxed max-w-[68ch]",
            isFeatured ? "text-base sm:text-lg" : "text-sm",
          )}
        >
          {article.description}
        </p>
      </div>

      <div className="mt-6 pt-4 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-[var(--muted-foreground)] flex flex-wrap gap-x-3 gap-y-1">
          {article.author && <span>By {article.author}</span>}
          <time dateTime={article.publishedAt}>{article.publishedAt}</time>
        </div>

        <div className="flex items-center gap-2">
          {onToggleSave && (
            <Button
              type="button"
              variant={isSaved ? "subtle" : "outline"}
              size="sm"
              aria-pressed={isSaved}
              onClick={() => onToggleSave(article.id)}
            >
              {isSaved ? (
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>{isSaved ? "Saved" : "Save"}</span>
            </Button>
          )}
          <Button variant="primary" size="sm" asChild>
            <a
              href={article.originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleOutboundClick}
            >
              <span>Read at {article.publication}</span>
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </Button>
        </div>
      </div>
    </article>
  );
}

