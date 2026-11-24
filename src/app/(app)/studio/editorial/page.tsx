import React from 'react'
import Link from 'next/link'
import { Plus, BookOpen, Clock, Edit3, Eye, FileText, CheckCircle2, AlertCircle } from 'lucide-react'
import { getArticles, getCategories } from '@/lib/editorial/article-service'

export const dynamic = 'force-dynamic'

export default async function EditorialStudioPage() {
  const categories = await getCategories()
  const publishedArticles = await getArticles({ status: 'published', limit: 100 })
  const draftArticles = await getArticles({ status: 'draft', limit: 100 })
  const allArticles = [...publishedArticles, ...draftArticles]

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Studio Banner */}
      <div className="border-b border-border/40 bg-muted/10 px-8 py-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-primary uppercase tracking-wider mb-1.5">
              <BookOpen className="w-4 h-4" />
              <span>Solace Editorial System</span>
            </div>
            <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground">
              Editorial Studio & Content Management
            </h1>
            <p className="font-serif text-sm text-muted-foreground mt-1 max-w-xl">
              Author, manage, and publish original academic and intellectual essays stored in Solace’s first-party database.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/discover"
              className="px-4 py-2 rounded-md border border-border/60 hover:bg-muted/30 text-xs font-medium transition-colors"
            >
              View Public Library
            </Link>
            <Link
              href="/studio/editorial/new"
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Write Original Article</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-8 space-y-8">
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg border border-border/40 bg-muted/10 space-y-1">
            <span className="text-[11px] font-mono uppercase text-muted-foreground">Total Articles</span>
            <div className="text-2xl font-serif font-semibold">{allArticles.length}</div>
          </div>
          <div className="p-4 rounded-lg border border-border/40 bg-muted/10 space-y-1">
            <span className="text-[11px] font-mono uppercase text-emerald-600 dark:text-emerald-400">Published Live</span>
            <div className="text-2xl font-serif font-semibold text-emerald-600 dark:text-emerald-400">
              {publishedArticles.length}
            </div>
          </div>
          <div className="p-4 rounded-lg border border-border/40 bg-muted/10 space-y-1">
            <span className="text-[11px] font-mono uppercase text-amber-600 dark:text-amber-400">In Draft</span>
            <div className="text-2xl font-serif font-semibold text-amber-600 dark:text-amber-400">
              {draftArticles.length}
            </div>
          </div>
          <div className="p-4 rounded-lg border border-border/40 bg-muted/10 space-y-1">
            <span className="text-[11px] font-mono uppercase text-muted-foreground">Disciplines</span>
            <div className="text-2xl font-serif font-semibold">{categories.length}</div>
          </div>
        </div>

        {/* Articles Table */}
        <div className="rounded-lg border border-border/40 bg-background overflow-hidden">
          <div className="px-6 py-4 border-b border-border/40 flex items-center justify-between">
            <h2 className="font-serif text-lg font-medium">All Essays & Articles</h2>
            <span className="text-xs font-mono text-muted-foreground">{allArticles.length} entries</span>
          </div>

          <div className="divide-y divide-border/20">
            {allArticles.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                <p className="font-serif text-sm text-muted-foreground">No articles created yet.</p>
                <Link
                  href="/studio/editorial/new"
                  className="inline-flex items-center gap-1.5 text-xs text-primary underline"
                >
                  Create your first essay
                </Link>
              </div>
            ) : (
              allArticles.map((article) => (
                <div
                  key={article.id}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/10 transition-colors"
                >
                  <div className="space-y-1.5 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider ${
                          article.status === 'published'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {article.status}
                      </span>
                      {article.category && (
                        <span className="text-xs font-mono text-muted-foreground">
                          {article.category.name}
                        </span>
                      )}
                      {article.isFeatured && (
                        <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 border border-amber-500/30 px-1.5 py-0.2 rounded">
                          Featured
                        </span>
                      )}
                    </div>
                    <h3 className="font-serif text-lg font-medium leading-snug">
                      <Link
                        href={`/studio/editorial/${article.id}`}
                        className="hover:text-primary transition-colors"
                      >
                        {article.title}
                      </Link>
                    </h3>
                    {article.subtitle && (
                      <p className="font-serif text-xs text-muted-foreground line-clamp-1 italic">
                        {article.subtitle}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-[11px] font-mono text-muted-foreground/70 pt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {article.readingTimeMinutes} min read
                      </span>
                      <span>•</span>
                      <span>
                        Updated {new Date(article.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start md:self-center">
                    {article.status === 'published' && (
                      <Link
                        href={`/articles/${article.slug}`}
                        target="_blank"
                        className="p-2 rounded-md border border-border/50 hover:bg-muted/30 text-muted-foreground hover:text-foreground text-xs transition-colors"
                        title="View Live Reader"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                    )}
                    <Link
                      href={`/studio/editorial/${article.id}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border/60 hover:bg-muted/40 text-xs font-medium transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
