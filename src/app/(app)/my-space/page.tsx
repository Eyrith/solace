'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Compass,
  Bookmark,
  MessageSquare,
  BookOpen,
  Lock,
  Search,
  ChevronRight,
} from 'lucide-react'
import { SEED_ARTICLES } from '@/lib/editorial/first-party-seed'

export default function MySpaceDashboardPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'saved' | 'thoughts' | 'discourse' | 'notebooks'>('all')

  // Sample personal items
  const savedArticles = SEED_ARTICLES.slice(0, 2)
  const sampleThoughts = [
    {
      id: 'th-1',
      sourceTitle: 'The Architecture of Inwardness',
      sourceType: 'Article',
      sourceUrl: '/articles/architecture-of-inwardness',
      text: 'The distinction between the public storefront and the back shop mirrors modern boundaries between professional persona and psychological interiority.',
      tags: ['philosophy', 'montaigne'],
      date: '2 hours ago',
    },
    {
      id: 'th-2',
      sourceTitle: 'Stack vs. Heap Memory',
      sourceType: 'B.Tech CS101 Lesson',
      sourceUrl: '/academics/btech/cse/1/CS101/1/stack-vs-heap-memory',
      text: 'L1/L2 cache locality explains why array traversals on the stack outperform heap-allocated linked lists by an order of magnitude.',
      tags: ['systems', 'cache'],
      date: 'Yesterday',
    },
  ]

  const sampleDiscourses = [
    {
      id: 'disc-1',
      sourceTitle: 'Turing, Gödel, and the Limits of Computational Certainty',
      sourceUrl: '/articles/turing-godel-limits-of-certainty',
      peerName: 'dr.marcus@oxford.edu',
      lastMessage: 'If Gödelian sentences escape mechanical proof, does that imply the human mind is fundamentally non-algorithmic?',
      status: 'active',
      date: '1 hour ago',
    },
  ]

  const sampleNotebooks = [
    {
      id: 'nb-1',
      title: 'CS101: Computational Logic & Memory Architecture',
      subject: 'CS101',
      degree: 'B.Tech CSE',
      lastUpdated: 'Today',
      snippet: 'Key distinction between virtual address translation and hardware MMU registers...',
    },
    {
      id: 'nb-2',
      title: 'MTH101: Spectral Decompositions and Basis Spaces',
      subject: 'MTH101',
      degree: 'B.Tech CSE',
      lastUpdated: '3 days ago',
      snippet: 'Proving that symmetric matrices over real fields have orthogonal eigenvectors...',
    },
  ]

  // Filter based on search query
  const matchesSearch = (text: string) => {
    if (!searchQuery.trim()) return true
    return text.toLowerCase().includes(searchQuery.toLowerCase())
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Banner */}
      <div className="border-b border-border/40 bg-muted/10 px-8 py-10">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-mono text-primary uppercase tracking-wider">
                <Compass className="w-4 h-4" />
                <span>Personal Intellectual Operating System</span>
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
                My Space
              </h1>
              <p className="font-serif text-xs text-muted-foreground max-w-xl leading-relaxed">
                Your unified repository of saved inquiries, personal thoughts, active peer discourses, and academic course notebooks.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/discover"
                className="px-3.5 py-1.5 rounded-md border border-border/60 hover:bg-muted/30 text-xs font-medium transition-colors"
              >
                Browse Library
              </Link>
              <Link
                href="/academics"
                className="px-3.5 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium transition-colors shadow-xs"
              >
                Continue Curriculum
              </Link>
            </div>
          </div>

          {/* Unified Knowledge Search Bar */}
          <div className="relative max-w-2xl">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search across your saved articles, personal thoughts, notes, and discourses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border/60 bg-background text-xs font-serif text-foreground placeholder:text-muted-foreground/40 focus:outline-hidden focus:border-primary"
            />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-10 space-y-10">
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg border border-border/40 bg-card space-y-1">
            <span className="text-[11px] font-mono text-muted-foreground uppercase">Saved Inquiries</span>
            <div className="text-2xl font-serif font-semibold">{savedArticles.length}</div>
          </div>
          <div className="p-4 rounded-lg border border-border/40 bg-card space-y-1">
            <span className="text-[11px] font-mono text-amber-500 uppercase">Private Thoughts</span>
            <div className="text-2xl font-serif font-semibold text-amber-500">{sampleThoughts.length}</div>
          </div>
          <div className="p-4 rounded-lg border border-border/40 bg-card space-y-1">
            <span className="text-[11px] font-mono text-primary uppercase">Active Discourses</span>
            <div className="text-2xl font-serif font-semibold text-primary">{sampleDiscourses.length}</div>
          </div>
          <div className="p-4 rounded-lg border border-border/40 bg-card space-y-1">
            <span className="text-[11px] font-mono text-emerald-500 uppercase">Subject Notebooks</span>
            <div className="text-2xl font-serif font-semibold text-emerald-500">{sampleNotebooks.length}</div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 border-b border-border/40 pb-2 text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All Activity
          </button>
          <button
            onClick={() => setActiveTab('thoughts')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'thoughts' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Lock className="w-3 h-3" />
            <span>My Thoughts</span>
          </button>
          <button
            onClick={() => setActiveTab('discourse')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'discourse' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <MessageSquare className="w-3 h-3" />
            <span>Discourse Debates</span>
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'saved' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Bookmark className="w-3 h-3" />
            <span>Saved Essays</span>
          </button>
          <button
            onClick={() => setActiveTab('notebooks')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'notebooks' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <BookOpen className="w-3 h-3" />
            <span>Academic Notebooks</span>
          </button>
        </div>

        {/* CONTENT STREAMS */}
        <div className="space-y-8">
          {/* MY THOUGHTS SECTION */}
          {(activeTab === 'all' || activeTab === 'thoughts') && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-lg font-semibold flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-500" />
                  <span>Personal Thoughts &amp; Concept Reflections</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sampleThoughts.filter((t) => matchesSearch(t.text) || matchesSearch(t.sourceTitle)).map((th) => (
                  <div key={th.id} className="p-5 rounded-lg border border-border/40 bg-card space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                        <Link href={th.sourceUrl} className="hover:text-primary transition-colors truncate max-w-[240px]">
                          {th.sourceType}: {th.sourceTitle}
                        </Link>
                        <span>{th.date}</span>
                      </div>
                      <p className="font-serif text-xs text-foreground/90 leading-relaxed">
                        &ldquo;{th.text}&rdquo;
                      </p>
                    </div>

                    <div className="pt-2 border-t border-border/20 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        {th.tags.map((tag) => (
                          <span key={tag} className="text-[10px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                            #{tag}
                          </span>
                        ))}
                      </div>
                      <Link href={th.sourceUrl} className="text-primary hover:underline text-xs flex items-center gap-1">
                        <span>Open Source</span>
                        <ChevronRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ACTIVE DISCOURSE SECTION */}
          {(activeTab === 'all' || activeTab === 'discourse') && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-lg font-semibold flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  <span>Two-Person Intellectual Discourses</span>
                </h3>
              </div>

              <div className="space-y-3">
                {sampleDiscourses.filter((d) => matchesSearch(d.sourceTitle) || matchesSearch(d.lastMessage)).map((disc) => (
                  <div
                    key={disc.id}
                    className="p-5 rounded-lg border border-border/40 bg-card flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-600">
                          {disc.status}
                        </span>
                        <span className="text-xs font-serif text-muted-foreground">
                          With: <strong className="text-foreground">{disc.peerName}</strong>
                        </span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-[11px] font-mono text-muted-foreground">{disc.date}</span>
                      </div>
                      <h4 className="font-serif text-sm font-medium text-foreground">
                        Re: {disc.sourceTitle}
                      </h4>
                      <p className="font-serif text-xs text-muted-foreground line-clamp-1 italic">
                        &ldquo;{disc.lastMessage}&rdquo;
                      </p>
                    </div>

                    <Link
                      href={disc.sourceUrl}
                      className="flex items-center gap-1 text-xs text-primary font-medium hover:underline shrink-0"
                    >
                      <span>Continue Debate</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ACADEMIC NOTEBOOKS SECTION */}
          {(activeTab === 'all' || activeTab === 'notebooks') && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-lg font-semibold flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-500" />
                  <span>Subject-Linked Course Notebooks</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sampleNotebooks.filter((nb) => matchesSearch(nb.title) || matchesSearch(nb.snippet)).map((nb) => (
                  <div key={nb.id} className="p-5 rounded-lg border border-border/40 bg-card space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-primary/10 text-primary">
                          {nb.subject}
                        </span>
                        <span className="text-[11px] font-mono text-muted-foreground">
                          {nb.degree}
                        </span>
                      </div>
                      <h4 className="font-serif text-base font-medium text-foreground">
                        {nb.title}
                      </h4>
                      <p className="font-serif text-xs text-muted-foreground line-clamp-2">
                        {nb.snippet}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-border/20 flex items-center justify-between text-xs font-mono text-muted-foreground">
                      <span>Updated {nb.lastUpdated}</span>
                      <span className="text-primary font-serif font-medium">Open Notes &rarr;</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* SAVED ARTICLES */}
          {(activeTab === 'all' || activeTab === 'saved') && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-lg font-semibold flex items-center gap-2">
                  <Bookmark className="w-4 h-4 text-primary" />
                  <span>Saved Original Inquiries</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedArticles.filter((a) => matchesSearch(a.title) || matchesSearch(a.excerpt || '')).map((art) => (
                  <Link
                    key={art.id}
                    href={`/articles/${art.slug}`}
                    className="p-5 rounded-lg border border-border/40 bg-card hover:bg-muted/10 transition-colors group space-y-2.5"
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                      <span className="text-primary font-medium">{art.category?.name}</span>
                      <span>{art.readingTimeMinutes}m read</span>
                    </div>
                    <h4 className="font-serif text-base font-medium text-foreground group-hover:text-primary transition-colors">
                      {art.title}
                    </h4>
                    <p className="font-serif text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {art.excerpt}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
