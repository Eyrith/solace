'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Save,
  Eye,
  Edit3,
  CheckCircle2,
  Trash2,
  Plus,
  BookOpen,
  Clock,
  Sparkles,
  ArrowLeft,
  Columns,
  Code,
  Quote,
  Heading,
  Bold,
  Italic,
  List,
} from 'lucide-react'
import { MarkdownRenderer } from './markdown-renderer'
import { saveArticleAction, deleteArticleAction } from '@/app/actions/editorial-actions'
import type { Article, ArticleCategory, ArticleStatus, ArticleCitation } from '@/lib/editorial/types'

interface EditorialEditorProps {
  initialArticle?: Article | null
  categories: ArticleCategory[]
}

export function EditorialEditor({ initialArticle, categories }: EditorialEditorProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [viewMode, setViewMode] = useState<'split' | 'edit' | 'preview'>('split')
  const [savedNotification, setSavedNotification] = useState<string | null>(null)
  const [errorNotification, setErrorNotification] = useState<string | null>(null)

  // Form states
  const [id, setId] = useState<string | undefined>(initialArticle?.id)
  const [title, setTitle] = useState(initialArticle?.title || '')
  const [subtitle, setSubtitle] = useState(initialArticle?.subtitle || '')
  const [slug, setSlug] = useState(initialArticle?.slug || '')
  const [categoryId, setCategoryId] = useState(initialArticle?.categoryId || categories[0]?.id || '')
  const [excerpt, setExcerpt] = useState(initialArticle?.excerpt || '')
  const [content, setContent] = useState(initialArticle?.content || '')
  const [coverImageUrl, setCoverImageUrl] = useState(initialArticle?.coverImageUrl || '')
  const [status, setStatus] = useState<ArticleStatus>(initialArticle?.status || 'draft')
  const [isFeatured, setIsFeatured] = useState(Boolean(initialArticle?.isFeatured))
  const [citations, setCitations] = useState<Omit<ArticleCitation, 'id' | 'articleId'>[]>(
    initialArticle?.citations?.map((c) => ({
      citationOrder: c.citationOrder,
      sourceTitle: c.sourceTitle,
      authorName: c.authorName,
      publicationYear: c.publicationYear,
      url: c.url,
      doi: c.doi,
    })) || []
  )

  // Auto-calculated reading time
  const readingTime = Math.max(1, Math.ceil((content.trim().split(/\s+/).length || 1) / 200))

  // Citation handlers
  const handleAddCitation = () => {
    setCitations([
      ...citations,
      {
        citationOrder: citations.length + 1,
        sourceTitle: '',
        authorName: '',
        publicationYear: new Date().getFullYear(),
        url: '',
        doi: '',
      },
    ])
  }

  const handleUpdateCitation = (index: number, field: string, value: any) => {
    const updated = [...citations]
    updated[index] = { ...updated[index], [field]: value }
    setCitations(updated)
  }

  const handleRemoveCitation = (index: number) => {
    setCitations(citations.filter((_, i) => i !== index))
  }

  // Formatting helpers
  const insertFormatting = (prefix: string, suffix: string = '') => {
    const textarea = document.getElementById('article-content-editor') as HTMLTextAreaElement
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = content.substring(start, end)
    const replacement = `${prefix}${selected || 'text'}${suffix}`
    const newContent = content.substring(0, start) + replacement + content.substring(end)
    setContent(newContent)
  }

  const handleSave = (targetStatus?: ArticleStatus) => {
    if (!title.trim()) {
      setErrorNotification('Please provide an article title.')
      return
    }

    const finalStatus = targetStatus || status
    startTransition(async () => {
      setErrorNotification(null)
      const res = await saveArticleAction({
        id,
        title,
        subtitle,
        slug: slug.trim() || undefined,
        categoryId,
        excerpt,
        content,
        coverImageUrl,
        status: finalStatus,
        isFeatured,
        citations,
      })

      if (res.success && res.article) {
        setId(res.article.id)
        setStatus(res.article.status)
        setSlug(res.article.slug)
        setSavedNotification(finalStatus === 'published' ? 'Article published successfully!' : 'Draft saved.')
        setTimeout(() => setSavedNotification(null), 3500)
        router.refresh()
      } else {
        setErrorNotification(res.error || 'Failed to save article.')
      }
    })
  }

  const handleDelete = () => {
    if (!id) return
    if (!confirm('Are you sure you want to delete this article? This action cannot be undone.')) return

    startTransition(async () => {
      const res = await deleteArticleAction(id)
      if (res.success) {
        router.push('/studio/editorial')
      } else {
        setErrorNotification(res.error || 'Failed to delete article.')
      }
    })
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top action header */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/95 backdrop-blur px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/studio/editorial')}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Studio</span>
          </button>
          <div className="h-4 w-px bg-border/60" />
          <h1 className="font-serif text-base font-medium truncate max-w-sm">
            {title || 'Untitled Article Draft'}
          </h1>
          <span
            className={`px-2 py-0.5 rounded text-[11px] font-mono uppercase tracking-wider ${
              status === 'published'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
            }`}
          >
            {status}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center rounded-lg border border-border/50 p-0.5 bg-muted/20 mr-2">
            <button
              type="button"
              onClick={() => setViewMode('edit')}
              className={`p-1.5 rounded text-xs transition-colors ${
                viewMode === 'edit' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Editor Only"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`p-1.5 rounded text-xs transition-colors ${
                viewMode === 'split' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Split View"
            >
              <Columns className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={`p-1.5 rounded text-xs transition-colors ${
                viewMode === 'preview' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Preview Only"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          </div>

          {id && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 rounded-md transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => handleSave('draft')}
            disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border/60 hover:bg-muted/40 text-xs font-medium transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Draft</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave(status === 'published' ? 'published' : 'published')}
            disabled={isPending}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium shadow-xs transition-colors"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{status === 'published' ? 'Update Live' : 'Publish'}</span>
          </button>
        </div>
      </header>

      {/* Notifications */}
      {savedNotification && (
        <div className="bg-emerald-500/15 border-b border-emerald-500/20 px-6 py-2 text-xs text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
          <span>{savedNotification}</span>
        </div>
      )}
      {errorNotification && (
        <div className="bg-destructive/15 border-b border-destructive/20 px-6 py-2 text-xs text-destructive flex items-center justify-between">
          <span>{errorNotification}</span>
        </div>
      )}

      {/* Editor Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Editor & Metadata */}
        <div
          className={`flex-1 flex flex-col border-r border-border/40 overflow-y-auto ${
            viewMode === 'preview' ? 'hidden' : 'block'
          }`}
        >
          {/* Metadata Accordion / Drawer */}
          <div className="p-6 border-b border-border/30 bg-muted/10 space-y-4">
            <div>
              <input
                type="text"
                placeholder="Article Title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-transparent font-serif text-3xl font-semibold tracking-tight text-foreground placeholder:text-muted-foreground/40 focus:outline-hidden"
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="Add an evocative subtitle or epigraph..."
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full bg-transparent font-serif text-lg text-foreground/80 placeholder:text-muted-foreground/40 focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-[11px] font-mono text-muted-foreground uppercase tracking-wider mb-1">
                  Category
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-md border border-border/50 bg-background px-3 py-1.5 text-xs text-foreground focus:outline-hidden focus:border-primary/50"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-muted-foreground uppercase tracking-wider mb-1">
                  Custom Slug
                </label>
                <input
                  type="text"
                  placeholder="auto-generated-from-title"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full rounded-md border border-border/50 bg-background px-3 py-1.5 text-xs text-foreground focus:outline-hidden focus:border-primary/50"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-muted-foreground uppercase tracking-wider mb-1">
                  Reading Duration
                </label>
                <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground bg-muted/20 border border-border/40 rounded-md">
                  <Clock className="w-3.5 h-3.5" />
                  <span>~{readingTime} min read ({content.trim().split(/\s+/).length || 0} words)</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-muted-foreground uppercase tracking-wider mb-1">
                Executive Excerpt / Abstract
              </label>
              <textarea
                rows={2}
                placeholder="A refined summary displayed in catalogs and previews..."
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                className="w-full rounded-md border border-border/50 bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-hidden focus:border-primary/50 resize-none font-serif leading-relaxed"
              />
            </div>

            <div className="flex items-center gap-6 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-0"
                />
                <span className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  Feature on Solace front page
                </span>
              </label>
            </div>
          </div>

          {/* Markdown Formatting Toolbar */}
          <div className="px-6 py-2 border-b border-border/30 bg-muted/20 flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => insertFormatting('## ')}
              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
              title="Heading 2"
            >
              <Heading className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('**', '**')}
              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
              title="Bold"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('*', '*')}
              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
              title="Italic"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('> ')}
              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
              title="Quote"
            >
              <Quote className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('```\n', '\n```')}
              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
              title="Code Block"
            >
              <Code className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('- ')}
              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
              title="List"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('$$\n', '\n$$')}
              className="px-2 py-1 rounded hover:bg-muted text-[11px] font-serif text-muted-foreground hover:text-foreground"
              title="Math Block"
            >
              LaTeX
            </button>
          </div>

          {/* Textarea Editor */}
          <div className="flex-1 p-6 flex flex-col">
            <textarea
              id="article-content-editor"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write the original article in Markdown..."
              className="w-full flex-1 min-h-[400px] bg-transparent font-mono text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/30 focus:outline-hidden resize-none"
            />
          </div>

          {/* Citations & References Section */}
          <div className="p-6 border-t border-border/40 bg-muted/10 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-sm font-medium flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-primary" />
                <span>Academic References & Citations ({citations.length})</span>
              </h3>
              <button
                type="button"
                onClick={handleAddCitation}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Citation</span>
              </button>
            </div>

            {citations.length === 0 ? (
              <p className="text-xs text-muted-foreground/60 italic font-serif">
                No citations added. Rigorous citations enhance the academic depth of Solace articles.
              </p>
            ) : (
              <div className="space-y-3">
                {citations.map((c, idx) => (
                  <div key={idx} className="p-3 rounded-md border border-border/40 bg-background space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-muted-foreground uppercase">
                        [{idx + 1}] Source Entry
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCitation(idx)}
                        className="text-muted-foreground hover:text-destructive text-xs"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Source Title / Book / Journal..."
                        value={c.sourceTitle}
                        onChange={(e) => handleUpdateCitation(idx, 'sourceTitle', e.target.value)}
                        className="w-full rounded border border-border/40 px-2 py-1 text-xs bg-transparent"
                      />
                      <input
                        type="text"
                        placeholder="Author(s)..."
                        value={c.authorName || ''}
                        onChange={(e) => handleUpdateCitation(idx, 'authorName', e.target.value)}
                        className="w-full rounded border border-border/40 px-2 py-1 text-xs bg-transparent"
                      />
                      <input
                        type="text"
                        placeholder="DOI (e.g. 10.1007/...)"
                        value={c.doi || ''}
                        onChange={(e) => handleUpdateCitation(idx, 'doi', e.target.value)}
                        className="w-full rounded border border-border/40 px-2 py-1 text-xs bg-transparent"
                      />
                      <input
                        type="text"
                        placeholder="URL (optional)"
                        value={c.url || ''}
                        onChange={(e) => handleUpdateCitation(idx, 'url', e.target.value)}
                        className="w-full rounded border border-border/40 px-2 py-1 text-xs bg-transparent"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Rendered Article Preview */}
        <div
          className={`flex-1 overflow-y-auto p-10 bg-background/50 ${
            viewMode === 'edit' ? 'hidden' : 'block'
          }`}
        >
          <div className="max-w-2xl mx-auto space-y-8">
            <div className="space-y-4 border-b border-border/40 pb-8">
              {categories.find((c) => c.id === categoryId) && (
                <span className="text-xs font-mono uppercase tracking-widest text-primary font-medium">
                  {categories.find((c) => c.id === categoryId)?.name}
                </span>
              )}
              <h1 className="font-serif text-4xl font-semibold tracking-tight text-foreground leading-tight">
                {title || 'Article Title'}
              </h1>
              {subtitle && (
                <p className="font-serif text-xl text-muted-foreground italic leading-relaxed">
                  {subtitle}
                </p>
              )}
              <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground pt-2">
                <span>Solace Editorial</span>
                <span>•</span>
                <span>{readingTime} min read</span>
                <span>•</span>
                <span>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
            </div>

            {/* Markdown rendered body */}
            <MarkdownRenderer content={content} />

            {/* Rendered Citations */}
            {citations.length > 0 && (
              <div className="pt-10 border-t border-border/40 space-y-4">
                <h4 className="font-serif text-base font-semibold text-foreground tracking-tight">
                  References & Further Reading
                </h4>
                <ol className="list-decimal ml-5 space-y-2 text-xs font-serif text-muted-foreground">
                  {citations.map((c, idx) => (
                    <li key={idx} className="leading-relaxed">
                      <span className="font-medium text-foreground">{c.sourceTitle}</span>
                      {c.authorName && <span> — {c.authorName}</span>}
                      {c.publicationYear && <span> ({c.publicationYear})</span>}
                      {c.doi && <span className="ml-2 font-mono text-[10px] text-primary">DOI: {c.doi}</span>}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
