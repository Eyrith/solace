'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  BookOpen,
  Clock,
  Sparkles,
  Share2,
  Bookmark,
  MessageSquare,
  Lock,
  Send,
  Check,
  ChevronRight,
  Maximize2,
  Minimize2,
  Sliders,
  Type,
  ArrowLeft,
  User,
  Quote,
  CheckCircle2,
} from 'lucide-react'
import { MarkdownRenderer } from './markdown-renderer'
import type { Article } from '@/lib/editorial/types'

interface ReadingEnvironmentProps {
  article: Article
  relatedArticles?: Article[]
}

interface ThoughtItem {
  id: string
  body: string
  anchorText?: string
  tags: string[]
  createdAt: string
}

interface DiscourseThreadItem {
  id: string
  thoughtBody: string
  recipientName: string
  status: 'active' | 'concluded'
  messagesCount: number
  lastActivity: string
}

export function ReadingEnvironment({ article, relatedArticles = [] }: ReadingEnvironmentProps) {
  // Reading state
  const [scrollProgress, setScrollProgress] = useState(0)
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>('normal')
  const [fontFamily, setFontFamily] = useState<'serif' | 'sans' | 'mono'>('serif')
  const [themeMode, setThemeMode] = useState<'default' | 'sepia'>('default')
  const [isFocusMode, setIsFocusMode] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [isSaved, setIsSaved] = useState(false)

  // Floating highlight toolbar
  const [selectedText, setSelectedText] = useState('')
  const [selectionPosition, setSelectionPosition] = useState<{ x: number; y: number } | null>(null)

  // Thoughts and Discourse state
  const [activeTab, setActiveTab] = useState<'thoughts' | 'discourse'>('thoughts')
  const [thoughts, setThoughts] = useState<ThoughtItem[]>([
    {
      id: 'th-demo-1',
      body: 'The distinction between the public storefront and the back shop mirrors modern boundaries between professional persona and psychological interiority.',
      anchorText: 'the "back shop" behind the storefront of public life',
      tags: ['psychology', 'montaigne'],
      createdAt: 'Just now',
    },
  ])
  const [newThoughtBody, setNewThoughtBody] = useState('')
  const [newThoughtTag, setNewThoughtTag] = useState('')
  const [newThoughtTags, setNewThoughtTags] = useState<string[]>([])
  const [thoughtAnchor, setThoughtAnchor] = useState<string | null>(null)

  // Discourse state
  const [discourseThreads, setDiscourseThreads] = useState<DiscourseThreadItem[]>([])
  const [showNewDiscourseModal, setShowNewDiscourseModal] = useState(false)
  const [discourseRecipient, setDiscourseRecipient] = useState('')
  const [selectedThoughtForDiscourse, setSelectedThoughtForDiscourse] = useState<string>('')
  const [discourseSuccessMessage, setDiscourseSuccessMessage] = useState<string | null>(null)

  // Scroll progress listener
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight
      if (totalHeight > 0) {
        const current = (window.scrollY / totalHeight) * 100
        setScrollProgress(Math.min(100, Math.max(0, current)))
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Highlight selection handler
  const handleHighlightSelect = (text: string) => {
    setSelectedText(text)
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      const rect = range.getBoundingClientRect()
      setSelectionPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 10,
      })
    }
  }

  const handleAddHighlightedThought = () => {
    setThoughtAnchor(selectedText)
    setActiveTab('thoughts')
    setSelectedText('')
    setSelectionPosition(null)
    const element = document.getElementById('thoughts-discourse-section')
    element?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleCreateThought = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newThoughtBody.trim()) return

    const item: ThoughtItem = {
      id: `th-${Date.now()}`,
      body: newThoughtBody.trim(),
      anchorText: thoughtAnchor || undefined,
      tags: newThoughtTags,
      createdAt: 'Just now',
    }
    setThoughts([item, ...thoughts])
    setNewThoughtBody('')
    setNewThoughtTags([])
    setThoughtAnchor(null)
  }

  const handleAddTag = () => {
    if (!newThoughtTag.trim()) return
    const formatted = newThoughtTag.trim().toLowerCase().replace(/^#/, '')
    if (!newThoughtTags.includes(formatted)) {
      setNewThoughtTags([...newThoughtTags, formatted])
    }
    setNewThoughtTag('')
  }

  const handleInitiateDiscourse = (e: React.FormEvent) => {
    e.preventDefault()
    if (!discourseRecipient.trim() || !selectedThoughtForDiscourse) return

    const sourceThought = thoughts.find((t) => t.id === selectedThoughtForDiscourse)
    const thread: DiscourseThreadItem = {
      id: `disc-${Date.now()}`,
      thoughtBody: sourceThought?.body || 'Discussion on article thesis',
      recipientName: discourseRecipient.trim(),
      status: 'active',
      messagesCount: 1,
      lastActivity: 'Just now',
    }

    setDiscourseThreads([thread, ...discourseThreads])
    setShowNewDiscourseModal(false)
    setDiscourseRecipient('')
    setSelectedThoughtForDiscourse('')
    setDiscourseSuccessMessage(`Private Discourse initiated with ${thread.recipientName}. Access is restricted strictly to both of you via PostgreSQL RLS.`)
    setTimeout(() => setDiscourseSuccessMessage(null), 5000)
  }

  // Typography class calculations
  const fontClass =
    fontFamily === 'serif' ? 'font-serif' : fontFamily === 'mono' ? 'font-mono' : 'font-sans'
  const fontSizeClass =
    fontSize === 'large' ? 'text-xl' : fontSize === 'xlarge' ? 'text-2xl' : 'text-lg'

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        themeMode === 'sepia'
          ? 'bg-[#fcf8f2] dark:bg-[#1a1714] text-[#2c2621] dark:text-[#ede7e1]'
          : 'bg-background text-foreground'
      }`}
    >
      {/* Top Reading Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-border/20">
        <div
          className="h-full bg-primary transition-all duration-150 ease-out"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Floating Header / Navbar */}
      <header
        className={`sticky top-0 z-40 border-b border-border/30 bg-background/90 backdrop-blur px-6 py-3 transition-opacity duration-300 ${
          isFocusMode ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/discover"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Library</span>
            </Link>
            <span className="text-border/60">/</span>
            {article.category && (
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                {article.category.name}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Typography Controls Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSettings(!showSettings)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border/50 hover:bg-muted/30 text-xs text-muted-foreground hover:text-foreground transition-colors"
                title="Typography & Appearance"
              >
                <Type className="w-3.5 h-3.5" />
                <span>Text</span>
              </button>

              {showSettings && (
                <div className="absolute right-0 top-full mt-2 w-64 p-4 rounded-lg border border-border/60 bg-background/95 backdrop-blur shadow-lg z-50 space-y-4 text-xs">
                  <div>
                    <span className="block text-[10px] font-mono uppercase text-muted-foreground mb-1.5">
                      Font Family
                    </span>
                    <div className="grid grid-cols-3 gap-1 p-0.5 rounded border border-border/50 bg-muted/20">
                      <button
                        onClick={() => setFontFamily('serif')}
                        className={`py-1 rounded font-serif text-xs ${
                          fontFamily === 'serif' ? 'bg-background shadow-xs text-foreground font-semibold' : 'text-muted-foreground'
                        }`}
                      >
                        Serif
                      </button>
                      <button
                        onClick={() => setFontFamily('sans')}
                        className={`py-1 rounded font-sans text-xs ${
                          fontFamily === 'sans' ? 'bg-background shadow-xs text-foreground font-semibold' : 'text-muted-foreground'
                        }`}
                      >
                        Sans
                      </button>
                      <button
                        onClick={() => setFontFamily('mono')}
                        className={`py-1 rounded font-mono text-xs ${
                          fontFamily === 'mono' ? 'bg-background shadow-xs text-foreground font-semibold' : 'text-muted-foreground'
                        }`}
                      >
                        Mono
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="block text-[10px] font-mono uppercase text-muted-foreground mb-1.5">
                      Font Size
                    </span>
                    <div className="grid grid-cols-3 gap-1 p-0.5 rounded border border-border/50 bg-muted/20">
                      <button
                        onClick={() => setFontSize('normal')}
                        className={`py-1 rounded text-xs ${
                          fontSize === 'normal' ? 'bg-background shadow-xs text-foreground font-semibold' : 'text-muted-foreground'
                        }`}
                      >
                        Normal
                      </button>
                      <button
                        onClick={() => setFontSize('large')}
                        className={`py-1 rounded text-xs ${
                          fontSize === 'large' ? 'bg-background shadow-xs text-foreground font-semibold' : 'text-muted-foreground'
                        }`}
                      >
                        Large
                      </button>
                      <button
                        onClick={() => setFontSize('xlarge')}
                        className={`py-1 rounded text-xs ${
                          fontSize === 'xlarge' ? 'bg-background shadow-xs text-foreground font-semibold' : 'text-muted-foreground'
                        }`}
                      >
                        Extra
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="block text-[10px] font-mono uppercase text-muted-foreground mb-1.5">
                      Reading Surface
                    </span>
                    <div className="grid grid-cols-2 gap-1 p-0.5 rounded border border-border/50 bg-muted/20">
                      <button
                        onClick={() => setThemeMode('default')}
                        className={`py-1 rounded text-xs ${
                          themeMode === 'default' ? 'bg-background shadow-xs text-foreground font-semibold' : 'text-muted-foreground'
                        }`}
                      >
                        Default
                      </button>
                      <button
                        onClick={() => setThemeMode('sepia')}
                        className={`py-1 rounded text-xs ${
                          themeMode === 'sepia' ? 'bg-background shadow-xs text-foreground font-semibold' : 'text-muted-foreground'
                        }`}
                      >
                        Sepia Tint
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Focus Mode Button */}
            <button
              type="button"
              onClick={() => setIsFocusMode(!isFocusMode)}
              className="p-1.5 rounded-md border border-border/50 hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-colors"
              title={isFocusMode ? 'Exit Focus Mode' : 'Enter Focus Mode'}
            >
              {isFocusMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            {/* Bookmark button */}
            <button
              type="button"
              onClick={() => setIsSaved(!isSaved)}
              className={`p-1.5 rounded-md border transition-colors ${
                isSaved
                  ? 'border-primary/50 text-primary bg-primary/10'
                  : 'border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/30'
              }`}
              title={isSaved ? 'Saved to Personal Library' : 'Save Article'}
            >
              <Bookmark className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Floating Highlight Pill Menu */}
      {selectedText && selectionPosition && (
        <div
          className="fixed z-50 transform -translate-x-1/2 -translate-y-full mb-2 bg-background/95 backdrop-blur border border-border shadow-lg rounded-full px-3 py-1.5 flex items-center gap-2 text-xs animate-in fade-in zoom-in-95 duration-150"
          style={{ left: `${selectionPosition.x}px`, top: `${selectionPosition.y}px` }}
        >
          <button
            onClick={handleAddHighlightedThought}
            className="flex items-center gap-1.5 text-primary hover:underline font-medium"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Add to My Thoughts</span>
          </button>
        </div>
      )}

      {/* Main Reading Canvas */}
      <main className="max-w-3xl mx-auto px-6 py-12 space-y-12">
        {/* Article Title & Metadata Header */}
        <div className="space-y-4 border-b border-border/40 pb-8">
          {article.category && (
            <Link
              href={`/discover?category=${article.category.slug}`}
              className="inline-block text-xs font-mono uppercase tracking-widest text-primary font-medium hover:underline"
            >
              {article.category.name}
            </Link>
          )}

          <h1 className="font-serif text-4xl sm:text-5xl font-semibold tracking-tight text-foreground leading-[1.15]">
            {article.title}
          </h1>

          {article.subtitle && (
            <p className="font-serif text-xl text-muted-foreground italic leading-relaxed pt-1">
              {article.subtitle}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs font-mono text-muted-foreground pt-4 border-t border-border/30">
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-primary" />
              <span>{article.author?.displayName || 'Solace Editorial'}</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>{article.readingTimeMinutes} min read</span>
            </div>
            <span>•</span>
            <span>
              {article.publishedAt
                ? new Date(article.publishedAt).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Original Essay'}
            </span>
          </div>
        </div>

        {/* Section A: Article Content */}
        <article className={`space-y-6 ${fontClass} ${fontSizeClass}`}>
          <MarkdownRenderer
            content={article.content}
            onHighlightSelect={handleHighlightSelect}
          />
        </article>

        {/* References & Citations */}
        {article.citations && article.citations.length > 0 && (
          <section className="pt-8 border-t border-border/40 space-y-4">
            <h3 className="font-serif text-lg font-medium text-foreground tracking-tight flex items-center gap-2">
              <Quote className="w-4 h-4 text-primary" />
              <span>References & Academic Citations</span>
            </h3>
            <ol className="list-decimal ml-5 space-y-2.5 text-xs font-serif text-muted-foreground">
              {article.citations.map((c, idx) => (
                <li key={c.id || idx} className="leading-relaxed">
                  <span className="font-medium text-foreground">{c.sourceTitle}</span>
                  {c.authorName && <span> — {c.authorName}</span>}
                  {c.publicationYear && <span> ({c.publicationYear})</span>}
                  {c.doi && (
                    <span className="ml-2 font-mono text-[10px] text-primary">
                      DOI: {c.doi}
                    </span>
                  )}
                  {c.url && (
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-primary underline"
                    >
                      [Source Link]
                    </a>
                  )}
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* SECTIONS B & C: MY THOUGHTS & PRIVATE DISCOURSE                      */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <section
          id="thoughts-discourse-section"
          className="pt-12 border-t-2 border-border/60 space-y-6"
        >
          {/* Section Header with Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-widest text-primary font-medium">
                Reflective Layer
              </span>
              <h2 className="font-serif text-2xl font-semibold text-foreground">
                Thoughts & Discourse
              </h2>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-border/50 p-1 bg-muted/20">
              <button
                onClick={() => setActiveTab('thoughts')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeTab === 'thoughts'
                    ? 'bg-background shadow-xs text-foreground font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Lock className="w-3.5 h-3.5 text-amber-500" />
                <span>My Thoughts ({thoughts.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('discourse')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeTab === 'discourse'
                    ? 'bg-background shadow-xs text-foreground font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-primary" />
                <span>Private Discourse ({discourseThreads.length})</span>
              </button>
            </div>
          </div>

          {discourseSuccessMessage && (
            <div className="p-3 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{discourseSuccessMessage}</span>
            </div>
          )}

          {/* TAB B: MY THOUGHTS */}
          {activeTab === 'thoughts' && (
            <div className="space-y-6">
              <div className="p-4 rounded-lg border border-border/50 bg-muted/15 space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5 font-medium text-foreground">
                    <Lock className="w-3.5 h-3.5 text-amber-500" />
                    <span>Personal Reflection (Strictly Private by Default)</span>
                  </span>
                  <span className="text-[11px] font-mono text-muted-foreground/60">
                    Never shared without your explicit consent
                  </span>
                </div>

                {thoughtAnchor && (
                  <div className="p-2.5 rounded bg-amber-500/10 border-l-2 border-amber-500 text-xs font-serif italic text-foreground/90">
                    <span className="font-mono text-[10px] text-amber-600 block not-italic uppercase mb-0.5">
                      Referenced Passage:
                    </span>
                    &ldquo;{thoughtAnchor}&rdquo;
                  </div>
                )}

                <form onSubmit={handleCreateThought} className="space-y-3">
                  <textarea
                    rows={3}
                    placeholder="Record your personal reflection, question the author’s premise, or note observations..."
                    value={newThoughtBody}
                    onChange={(e) => setNewThoughtBody(e.target.value)}
                    className="w-full rounded-md border border-border/50 bg-background p-3 text-sm font-serif leading-relaxed text-foreground placeholder:text-muted-foreground/40 focus:outline-hidden focus:border-primary/50 resize-none"
                  />

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Add tag (e.g. #critique)..."
                        value={newThoughtTag}
                        onChange={(e) => setNewThoughtTag(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                        className="rounded border border-border/40 px-2 py-1 text-xs bg-background"
                      />
                      <button
                        type="button"
                        onClick={handleAddTag}
                        className="px-2 py-1 text-xs rounded border border-border/40 hover:bg-muted/30"
                      >
                        Add Tag
                      </button>
                      {newThoughtTags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded text-[11px] font-mono bg-primary/10 text-primary"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>

                    <button
                      type="submit"
                      disabled={!newThoughtBody.trim()}
                      className="px-4 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium transition-colors disabled:opacity-50"
                    >
                      Save Private Thought
                    </button>
                  </div>
                </form>
              </div>

              {/* Thoughts Stream */}
              <div className="space-y-4">
                {thoughts.map((th) => (
                  <div
                    key={th.id}
                    className="p-5 rounded-lg border border-border/40 bg-background space-y-3"
                  >
                    {th.anchorText && (
                      <div className="pl-3 border-l-2 border-primary/40 text-xs font-serif italic text-muted-foreground">
                        &ldquo;{th.anchorText}&rdquo;
                      </div>
                    )}
                    <p className="font-serif text-sm leading-relaxed text-foreground/90">
                      {th.body}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-border/20 text-xs">
                      <div className="flex items-center gap-2">
                        {th.tags.map((t) => (
                          <span key={t} className="text-[10px] font-mono text-muted-foreground">
                            #{t}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedThoughtForDiscourse(th.id)
                            setShowNewDiscourseModal(true)
                          }}
                          className="flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>Share to Private Discourse</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB C: PRIVATE DISCOURSE */}
          {activeTab === 'discourse' && (
            <div className="space-y-6">
              <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="font-serif text-sm font-medium text-foreground">
                    Two-Person Intellectual Dialogue
                  </h4>
                  <p className="font-serif text-xs text-muted-foreground max-w-xl">
                    Invite a trusted peer or mentor to discuss an interpretation or debate a premise from this essay.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewDiscourseModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 shrink-0"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Start New Discourse</span>
                </button>
              </div>

              {discourseThreads.length === 0 ? (
                <div className="p-8 text-center rounded-lg border border-border/30 bg-muted/10 space-y-2">
                  <MessageSquare className="w-6 h-6 text-muted-foreground/40 mx-auto" />
                  <p className="font-serif text-sm text-muted-foreground">
                    No active discourse threads on this article yet.
                  </p>
                  <p className="text-xs text-muted-foreground/60 max-w-md mx-auto">
                    Select any of your private thoughts above and click &ldquo;Share to Private Discourse&rdquo; to begin a focused debate.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {discourseThreads.map((thread) => (
                    <div
                      key={thread.id}
                      className="p-4 rounded-lg border border-border/40 bg-background flex items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-600">
                            {thread.status}
                          </span>
                          <span className="text-xs font-serif text-muted-foreground">
                            With: <strong className="text-foreground">{thread.recipientName}</strong>
                          </span>
                        </div>
                        <p className="font-serif text-xs text-foreground/80 line-clamp-1 italic">
                          &ldquo;{thread.thoughtBody}&rdquo;
                        </p>
                      </div>

                      <button
                        type="button"
                        className="flex items-center gap-1 text-xs text-primary hover:underline font-medium shrink-0"
                      >
                        <span>Open Thread ({thread.messagesCount})</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Discovery: Related Articles */}
        {relatedArticles.length > 0 && (
          <section className="pt-12 border-t border-border/40 space-y-6">
            <h3 className="font-serif text-xl font-semibold text-foreground">
              Continue Intellectual Exploration
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {relatedArticles.map((rel) => (
                <Link
                  key={rel.id}
                  href={`/articles/${rel.slug}`}
                  className="p-5 rounded-lg border border-border/40 bg-background hover:bg-muted/10 transition-colors group space-y-2"
                >
                  {rel.category && (
                    <span className="text-[10px] font-mono uppercase tracking-wider text-primary">
                      {rel.category.name}
                    </span>
                  )}
                  <h4 className="font-serif text-base font-medium group-hover:text-primary transition-colors">
                    {rel.title}
                  </h4>
                  {rel.subtitle && (
                    <p className="font-serif text-xs text-muted-foreground line-clamp-2">
                      {rel.subtitle}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Share / Initiate Discourse Modal */}
      {showNewDiscourseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md p-6 rounded-xl border border-border bg-background shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h3 className="font-serif text-base font-semibold">Initiate Private Discourse</h3>
              <button
                type="button"
                onClick={() => setShowNewDiscourseModal(false)}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleInitiateDiscourse} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-mono text-muted-foreground uppercase mb-1">
                  Recipient (Username or Email)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. sophia.academic@solace.edu"
                  value={discourseRecipient}
                  onChange={(e) => setDiscourseRecipient(e.target.value)}
                  className="w-full rounded border border-border/50 bg-muted/10 p-2.5 text-xs text-foreground focus:outline-hidden focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-muted-foreground uppercase mb-1">
                  Select Thought or Passage to Discuss
                </label>
                <select
                  required
                  value={selectedThoughtForDiscourse}
                  onChange={(e) => setSelectedThoughtForDiscourse(e.target.value)}
                  className="w-full rounded border border-border/50 bg-muted/10 p-2 text-xs text-foreground focus:outline-hidden"
                >
                  <option value="">Select a thought...</option>
                  {thoughts.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.body.slice(0, 60)}...
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 rounded bg-amber-500/10 border border-amber-500/20 text-[11px] text-muted-foreground space-y-1">
                <span className="font-medium text-foreground flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-500" /> Strict Two-Person Isolation
                </span>
                <p>
                  Only you and the recipient can read this discussion. It will not appear in public feeds or search indexes.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewDiscourseModal(false)}
                  className="px-3 py-1.5 rounded border border-border/50 hover:bg-muted/20"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!discourseRecipient.trim() || !selectedThoughtForDiscourse}
                  className="px-4 py-1.5 rounded bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  Initiate Discussion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
