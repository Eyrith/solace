"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, Bookmark, Check, Clock, MessageSquareHeart, NotebookPen, Quote, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { CuratedArticle } from "@/lib/editorial/articles";

export interface ArticleReaderModalProps {
  article: CuratedArticle | null;
  isSaved: boolean;
  note: string;
  onClose: () => void;
  onToggleSave: (id: string) => void;
  onSaveNote: (id: string, note: string) => void;
  onRecordRead: (id: string) => void;
}

/**
 * In-app editorial brief & commonplace reflection drawer/modal.
 * Surfaces the curator takeaway, attribution metadata, personal marginalia editor,
 * and external canonical reading action without cluttering the discovery feed.
 */
export function ArticleReaderModal({
  article,
  isSaved,
  note,
  onClose,
  onToggleSave,
  onSaveNote,
  onRecordRead,
}: ArticleReaderModalProps) {
  const [draftOverride, setDraftOverride] = React.useState<{ articleId: string; text: string } | null>(null);
  const [savedNoticeId, setSavedNoticeId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!article) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [article, onClose]);

  if (!article) return null;

  const draftNote = draftOverride?.articleId === article.id ? draftOverride.text : note;
  const savedNotice = savedNoticeId === article.id;

  const activeSpaceId =
    typeof window !== "undefined"
      ? window.localStorage.getItem("sanctuary:active-space-id") || "space-1"
      : "space-1";

  const discussPrompt = encodeURIComponent(
    `Reading "${article.title}" (${article.publicationName})${article.keyTakeaway ? ` — ${article.keyTakeaway}` : ""}. What struck you most about this idea?`,
  );

  const handleSaveMarginalia = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveNote(article.id, draftNote);
    setDraftOverride(null);
    setSavedNoticeId(article.id);
    window.setTimeout(() => setSavedNoticeId((cur) => (cur === article.id ? null : cur)), 1800);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="article-reader-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[88dvh] overflow-y-auto rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--background)] shadow-xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--border)] bg-[var(--background)]/95 px-6 py-4 backdrop-blur-xs">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted-foreground)]">
            <Badge variant="outline">{article.publicationName}</Badge>
            <span className="capitalize">{article.category}</span>
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Clock className="h-3 w-3" />
              {article.readingDurationMinutes} min read
            </span>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close reader brief">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          <header className="space-y-3">
            <h2
              id="article-reader-title"
              className="font-[family-name:var(--ds-font-display)] text-2xl sm:text-3xl font-bold tracking-tight leading-tight text-[var(--foreground)]"
            >
              {article.title}
            </h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              By <span className="font-medium text-[var(--foreground)]">{article.author}</span>
              {article.authorRole ? ` · ${article.authorRole}` : ""} ·{" "}
              <time dateTime={article.publishedDate}>{article.publishedDate}</time>
            </p>
          </header>

          <p className="text-base leading-relaxed text-[var(--foreground)]/90">
            {article.description}
          </p>

          {article.keyTakeaway && (
            <blockquote className="rounded-[var(--ds-radius)] border-l-4 border-[var(--primary)] bg-[var(--card)] p-4 sm:p-5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--primary)]">
                <Quote className="h-3.5 w-3.5" />
                <span>Curator Key Takeaway</span>
              </div>
              <p className="font-[family-name:var(--ds-font-display)] text-base sm:text-lg italic leading-relaxed text-[var(--foreground)]">
                “{article.keyTakeaway}”
              </p>
            </blockquote>
          )}

          {article.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {article.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/search?q=${encodeURIComponent(tag)}`}
                  onClick={onClose}
                  className="rounded-full border border-[var(--border)] bg-[var(--card)] px-2.5 py-0.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--primary)]/50 transition-colors"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}

          <form
            onSubmit={handleSaveMarginalia}
            className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <label
                htmlFor="article-marginalia-input"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--foreground)]"
              >
                <NotebookPen className="h-3.5 w-3.5 text-[var(--primary)]" />
                <span>Personal Commonplace Marginalia</span>
              </label>
              {savedNotice && (
                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  Saved to browser
                </span>
              )}
            </div>
            <textarea
              id="article-marginalia-input"
              rows={3}
              value={draftNote}
              onChange={(e) => setDraftOverride({ articleId: article.id, text: e.target.value })}
              placeholder="Jot down a passage, reflection, or question this essay sparked..."
              className="w-full rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            />
            <div className="flex justify-end">
              <Button type="submit" variant="outline" size="sm">
                Save Note
              </Button>
            </div>
          </form>

          <footer className="pt-4 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant={isSaved ? "subtle" : "outline"}
                size="sm"
                onClick={() => onToggleSave(article.id)}
              >
                {isSaved ? <Check className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
                <span>{isSaved ? "Saved" : "Save Essay"}</span>
              </Button>

              {process.env.NODE_ENV === "development" && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/messages/${activeSpaceId}?prompt=${discussPrompt}`} onClick={onClose}>
                    <MessageSquareHeart className="h-3.5 w-3.5 text-[var(--primary)]" />
                    <span>Discuss in Sanctuary</span>
                  </Link>
                </Button>
              )}
            </div>

            <Button variant="primary" size="sm" asChild>
              <a
                href={article.originalUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onRecordRead(article.id)}
              >
                <span>Read full essay at {article.publicationName}</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </Button>
          </footer>
        </div>
      </div>
    </div>
  );
}
