'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowLeft, Clock, Trash2, ShieldCheck, ExternalLink } from 'lucide-react'
import { useEditorialCatalog } from '@/lib/editorial/use-catalog'
import { useEditorialLibrary } from '@/lib/editorial/library-store'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'

export default function ReadingHistoryPage() {
  const { history, historyEnabled, setHistoryTracking, clearHistory, isLoaded, serverSynced } =
    useEditorialLibrary()
  const { articles } = useEditorialCatalog()

  if (!isLoaded) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center text-sm text-[var(--muted-foreground)]">
        Loading reading records...
      </div>
    )
  }

  // Map history to articles with timestamp
  const historyEntries = history
    .map((item) => {
      const article = articles.find((a) => a.id === item.articleId)
      return { ...item, article }
    })
    .filter((entry): entry is typeof entry & { article: NonNullable<typeof entry.article> } =>
      Boolean(entry.article)
    )

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <header className="border-b border-[var(--border)] pb-8 space-y-3">
        <Link
          href="/discover"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Discover</span>
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="font-[family-name:var(--ds-font-display)] text-3xl sm:text-5xl font-bold tracking-tight text-[var(--foreground)]">
              Reading History
            </h1>
            <p className="text-sm text-[var(--muted-foreground)] font-light">
              {serverSynced
                ? 'Your private log of opened essays, synced to your reader account.'
                : 'A private log of recent essays opened from this device in browser storage.'}
            </p>
          </div>

          {historyEntries.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearHistory}
              className="text-xs text-[var(--destructive)] hover:bg-[var(--destructive)]/10"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Clear History
            </Button>
          )}
        </div>
      </header>

      {/* Privacy Control Panel */}
      <div className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-[var(--primary)] shrink-0" />
          <div>
            <div className="text-sm font-medium text-[var(--foreground)]">
              Local History Recording
            </div>
            <div className="text-xs text-[var(--muted-foreground)]">
              {historyEnabled
                ? 'Active — articles you read are logged locally for quick return.'
                : 'Paused — no new reading history will be stored on this device.'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            checked={historyEnabled}
            onCheckedChange={setHistoryTracking}
            aria-label="Toggle history recording"
          />
        </div>
      </div>

      {/* History List */}
      {historyEntries.length === 0 ? (
        <div className="rounded-[var(--ds-radius)] border border-dashed border-[var(--border)] p-12 text-center space-y-4 max-w-md mx-auto my-12">
          <div className="mx-auto h-12 w-12 rounded-full bg-[var(--muted)] flex items-center justify-center text-[var(--muted-foreground)]">
            <Clock className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-medium text-[var(--foreground)]">No reading history yet</h3>
            <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
              When you open essays to read at Psyche, Aeon, or The Marginalian, they will appear here so you can easily reference them again.
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/discover">Browse Inquiries</Link>
          </Button>
        </div>
      ) : (
        <div className="divide-y divide-[var(--border)] border border-[var(--border)] rounded-[var(--ds-radius)] bg-[var(--card)]">
          {historyEntries.map(({ article, readAt }) => (
            <div key={`${article.id}-${readAt}`} className="p-4 sm:p-5 flex items-start justify-between gap-4 hover:bg-[var(--muted)]/20 transition-colors">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                  <span className="font-semibold text-[var(--foreground)]">{article.publicationName}</span>
                  <span>·</span>
                  <span>{article.category}</span>
                  <span>·</span>
                  <span>Opened {new Date(readAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <h3 className="font-[family-name:var(--ds-font-display)] text-lg font-medium text-[var(--foreground)]">
                  <a
                    href={article.originalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {article.title}
                  </a>
                </h3>
                <p className="text-xs text-[var(--muted-foreground)] line-clamp-1 max-w-2xl">
                  {article.description}
                </p>
              </div>

              <Button variant="ghost" size="sm" asChild className="shrink-0">
                <a href={article.originalUrl} target="_blank" rel="noopener noreferrer">
                  <span>Read</span>
                  <ExternalLink className="h-3.5 w-3.5 ml-1" />
                </a>
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

