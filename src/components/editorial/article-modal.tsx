'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowUpRight, Lock, X } from 'lucide-react'
import type { Article } from '@/lib/editorial/types'
import { getArticleImage } from '@/lib/editorial/articles'
import { MarkdownRenderer } from '@/components/editorial/markdown-renderer'
import { getInitials } from '@/components/sanctuary/private-shell'
import { IconButton } from '@/components/ui/icon-button'
import { Dialog, DialogContent } from '@/components/ui/dialog'

export interface ArticleModalContentProps {
  article: Article
  onClose?: () => void
}

export function ArticleModalContent({ article, onClose }: ArticleModalContentProps) {
  const img = getArticleImage(article)
  const authorName = article.author?.displayName || 'Editorial Contributor'
  const authorInitials = getInitials(authorName)
  const dateFormatted = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : ''

  return (
    <div className="space-y-6">
      {/* Modal Top Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-[var(--border)] text-xs text-[var(--muted-foreground)]">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[var(--primary)] uppercase tracking-wider text-[11px]">
            {article.category?.name || 'Essay'}
          </span>
          <span>·</span>
          <span className="tabular-nums">{article.readingTimeMinutes} min read</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Link
            href={`/articles/${article.slug}`}
            className="inline-flex items-center gap-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] px-2 py-1 rounded-[calc(var(--ds-radius)-4px)] hover:bg-[var(--surface-2)] transition-colors"
            title="Open full page"
          >
            <span>Full page</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
          {onClose && (
            <IconButton
              variant="ghost"
              size="md"
              onClick={onClose}
              aria-label="Close reading view"
              className="h-8 w-8 min-h-8 min-w-8"
            >
              <X className="h-4 w-4" />
            </IconButton>
          )}
        </div>
      </div>

      {/* Modal Header */}
      <div className="pt-2 space-y-4">
        <h1 className="font-[family-name:var(--ds-font-display)] text-2xl sm:text-4xl font-semibold leading-tight text-[var(--foreground)]">
          {article.title}
        </h1>

        {article.subtitle && (
          <p className="font-[family-name:var(--ds-font-editorial)] text-base text-[var(--muted-foreground)] italic leading-relaxed">
            {article.subtitle}
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)] pt-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--surface-2)] text-[11px] font-semibold text-[var(--foreground)] border border-[var(--border)]">
              {authorInitials}
            </span>
            <span className="font-medium text-[var(--foreground)]">{authorName}</span>
          </div>
          {dateFormatted && <time dateTime={article.publishedAt || undefined}>{dateFormatted}</time>}
        </div>
      </div>

      {/* Hero image in modal */}
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[var(--ds-radius)] my-4 border border-[var(--border)]">
        <Image
          src={img.card}
          alt={img.alt}
          fill
          sizes="(max-width: 768px) 100vw, 720px"
          className="object-cover"
        />
      </div>

      {/* Editorial Body */}
      <div className="font-[family-name:var(--ds-font-editorial)] text-base sm:text-[17px] leading-[1.8] text-[var(--foreground)] space-y-5 max-w-[68ch]">
        <MarkdownRenderer content={article.content} />
      </div>

      {/* Bridge to private sanctuary at foot */}
      <div className="mt-10 pt-6 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--muted-foreground)]">
        <span>Meridian Public Editorial</span>
        <Link
          href="/home"
          className="inline-flex items-center gap-1.5 text-[var(--primary)] hover:underline underline-offset-4"
        >
          <Lock className="h-3.5 w-3.5" />
          <span>Private Sanctuary</span>
        </Link>
      </div>
    </div>
  )
}

export interface ArticleModalProps {
  article: Article
}

export function ArticleModal({ article }: ArticleModalProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(true)

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      router.back()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        hideCloseButton
        className="max-w-3xl max-h-[90dvh] overflow-y-auto p-6 sm:p-10 border border-[var(--border)] bg-[var(--surface-1)] shadow-[var(--shadow-2)] rounded-[var(--ds-radius)]"
      >
        <ArticleModalContent article={article} onClose={() => handleOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}
