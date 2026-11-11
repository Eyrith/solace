'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  Heart,
  Plus,
  Mail,
  Calendar,
  Lock,
  Globe,
  CheckCircle2,
  Image as ImageIcon,
  Clock,
  Sparkles,
  ArrowLeft,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface MemoryItem {
  id: string
  title: string
  date: string
  description: string
  tag: string
  isLetter?: boolean
  isPrivateJournal?: boolean
}

const INITIAL_MEMORIES: MemoryItem[] = [
  {
    id: 'm1',
    title: 'The Evening by the Riverwalk',
    date: 'Dec 24, 2024',
    description: 'We sat on the wooden bench watching the river freeze over while sharing warm ginger tea. Neither of us wanted to go inside.',
    tag: 'Quiet Moments',
  },
  {
    id: 'm2',
    title: 'Digital Love Letter: For When You Wonder If You Are Enough',
    date: 'Jan 12, 2025',
    description: 'A scheduled letter written on a late Tuesday night reminding you of how your gentle presence lights up every room.',
    tag: 'Love Letters',
    isLetter: true,
  },
  {
    id: 'm3',
    title: 'Private Journal: Emotional Reflection on Work Stress',
    date: 'Feb 02, 2025',
    description: 'My private thoughts after that difficult meeting. Only visible to me unless I decide to share.',
    tag: 'Private Notes',
    isPrivateJournal: true,
  },
]

export default function MemoriesPage() {
  const [activeTab, setActiveTab] = React.useState<'all' | 'memories' | 'letters' | 'journal'>('all')
  const [items, setItems] = React.useState<MemoryItem[]>(INITIAL_MEMORIES)
  const [isCreating, setIsCreating] = React.useState(false)
  const [newTitle, setNewTitle] = React.useState('')
  const [newDesc, setNewDesc] = React.useState('')
  const [itemType, setItemType] = React.useState<'memory' | 'letter' | 'journal'>('memory')

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return

    const newItem: MemoryItem = {
      id: `mem-${Date.now()}`,
      title: newTitle,
      date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
      description: newDesc,
      tag: itemType === 'letter' ? 'Love Letters' : itemType === 'journal' ? 'Private Notes' : 'Shared Moments',
      isLetter: itemType === 'letter',
      isPrivateJournal: itemType === 'journal',
    }

    setItems((prev) => [newItem, ...prev])
    setNewTitle('')
    setNewDesc('')
    setIsCreating(false)
  }

  const filtered = items.filter((item) => {
    if (activeTab === 'memories') return !item.isLetter && !item.isPrivateJournal
    if (activeTab === 'letters') return item.isLetter
    if (activeTab === 'journal') return item.isPrivateJournal
    return true
  })

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-8">
      {/* ── Top Bar ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider font-medium text-[var(--primary)] mb-1">
            <Heart className="h-3.5 w-3.5" />
            <span>Shared Archive</span>
          </div>
          <h1 className="font-[family-name:var(--ds-font-display)] text-3xl font-bold tracking-tight text-[var(--foreground)]">
            Memories, Letters &amp; Journals
          </h1>
          <p className="text-xs sm:text-sm text-[var(--muted-foreground)]">
            Preserve milestones, write scheduled love letters, or write private personal notes.
          </p>
        </div>

        <Button onClick={() => setIsCreating(true)} variant="primary" size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          <span>New Entry</span>
        </Button>
      </div>

      {/* ── Filter Tabs ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 text-xs">
        {[
          { id: 'all', label: 'All Entries' },
          { id: 'memories', label: 'Shared Moments' },
          { id: 'letters', label: 'Digital Letters' },
          { id: 'journal', label: 'Private Journal (Only You)' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3 py-1.5 rounded-full transition-colors cursor-pointer border ${
              activeTab === tab.id
                ? 'bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)] font-medium'
                : 'bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)] hover:text-[var(--foreground)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Create Modal / Form ────────────────────────────────────────────── */}
      {isCreating && (
        <form onSubmit={handleCreate} className="p-6 rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
            <h3 className="font-semibold text-sm text-[var(--foreground)]">
              Create New Archive Entry
            </h3>
            <button onClick={() => setIsCreating(false)} className="text-xs text-[var(--muted-foreground)] hover:underline">
              Cancel
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-[var(--muted-foreground)]">Type:</span>
            <button
              type="button"
              onClick={() => setItemType('memory')}
              className={`px-2.5 py-1 rounded-full border ${itemType === 'memory' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--muted)] text-[var(--muted-foreground)]'}`}
            >
              Shared Memory
            </button>
            <button
              type="button"
              onClick={() => setItemType('letter')}
              className={`px-2.5 py-1 rounded-full border ${itemType === 'letter' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--muted)] text-[var(--muted-foreground)]'}`}
            >
              Digital Love Letter
            </button>
            <button
              type="button"
              onClick={() => setItemType('journal')}
              className={`px-2.5 py-1 rounded-full border ${itemType === 'journal' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--muted)] text-[var(--muted-foreground)]'}`}
            >
              Private Journal (Strict Solo)
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--foreground)]">Title</label>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Star gazing on the balcony..."
              className="w-full text-sm rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--background)] p-2.5 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--foreground)]">Content</label>
            <textarea
              required
              rows={4}
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Write your memory, letter, or private contemplation..."
              className="w-full text-sm rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--background)] p-2.5 focus:outline-none focus:ring-1 focus:ring-[var(--primary)] resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsCreating(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Entry
            </Button>
          </div>
        </form>
      )}

      {/* ── Memories List ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] p-6 space-y-4 hover:border-[var(--primary)]/70 transition-all flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
                <span className="font-mono">{item.date}</span>
                {item.isPrivateJournal ? (
                  <Badge variant="outline" className="text-[11px] text-amber-600 dark:text-amber-400 border-amber-500/30">
                    <Lock className="h-3 w-3 mr-1" />
                    Private Journal (Only You)
                  </Badge>
                ) : item.isLetter ? (
                  <Badge variant="outline" className="text-[11px] text-purple-600 dark:text-purple-400 border-purple-500/30">
                    <Mail className="h-3 w-3 mr-1" />
                    Love Letter
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[11px]">
                    {item.tag}
                  </Badge>
                )}
              </div>

              <h3 className="font-[family-name:var(--ds-font-display)] text-xl font-semibold text-[var(--foreground)]">
                {item.title}
              </h3>

              <p className="text-xs sm:text-sm text-[var(--muted-foreground)] leading-relaxed font-light">
                {item.description}
              </p>
            </div>

            <div className="pt-4 border-t border-[var(--border)]/70 flex items-center justify-between text-xs text-[var(--muted-foreground)]">
              <span>{item.isPrivateJournal ? 'Encrypted locally' : 'Shared in Space'}</span>
              <button className="text-[var(--primary)] hover:underline cursor-pointer">
                Read full note &rarr;
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

