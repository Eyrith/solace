'use client'

import * as React from 'react'
import { Heart, Plus, Mail, Lock, Trash2, Share2, X, Pencil, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatusBanner } from '@/components/ui/status-banner'
import { useSanctuary } from '@/components/providers/sanctuary-provider'
import {
  type LocalMemoryEntry,
  createLocalMemory,
  deleteLocalMemory,
  listLocalMemories,
  subscribeLocalSanctuary,
  updateLocalMemory,
} from '@/lib/sanctuary/local-store'

type EntryKind = 'memory' | 'letter' | 'journal' | 'shared_note'

interface MemoryItem {
  id: string
  kind: EntryKind
  title: string
  date: string
  description: string
  tag: string
  isLetter?: boolean
  isPrivateJournal?: boolean
  isOwn?: boolean
}

function mapLocalMemoryToItem(entry: LocalMemoryEntry, actor: 'self' | 'partner'): MemoryItem {
  return {
    id: entry.id,
    kind: entry.type,
    title: entry.title,
    date: entry.entryDate,
    description: entry.content,
    tag:
      entry.type === 'letter'
        ? 'Love Letters'
        : entry.type === 'journal'
          ? entry.isShared
            ? 'Shared Reflection'
            : 'Private Notes'
          : 'Shared Moments',
    isLetter: entry.type === 'letter',
    isPrivateJournal: entry.type === 'journal' && !entry.isShared,
    isOwn: entry.authorRole === actor,
  }
}

export default function MemoriesPage() {
  const { activeSpaceId, configured, demoActor, loading: spaceLoading } = useSanctuary()
  const [activeTab, setActiveTab] = React.useState<'all' | 'memories' | 'letters' | 'journal'>('all')
  const [searchQuery, setSearchQuery] = React.useState('')
  const [items, setItems] = React.useState<MemoryItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [isCreating, setIsCreating] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [newTitle, setNewTitle] = React.useState('')
  const [newDesc, setNewDesc] = React.useState('')
  const [newDate, setNewDate] = React.useState(() => new Date().toISOString().slice(0, 10))
  const [itemType, setItemType] = React.useState<'memory' | 'letter' | 'journal'>('memory')
  const [selectedItem, setSelectedItem] = React.useState<MemoryItem | null>(null)
  const [editingSelected, setEditingSelected] = React.useState(false)
  const [editTitle, setEditTitle] = React.useState('')
  const [editDesc, setEditDesc] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)

  const targetSpaceId = activeSpaceId ?? 'space-1'

  const refreshLocalMemories = React.useCallback(() => {
    setItems(listLocalMemories(targetSpaceId, demoActor).map((e) => mapLocalMemoryToItem(e, demoActor)))
    setLoading(false)
  }, [targetSpaceId, demoActor])

  const loadEntries = React.useCallback(async () => {
    if (!configured) {
      refreshLocalMemories()
      return
    }
    if (!activeSpaceId) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/memories?spaceId=${encodeURIComponent(activeSpaceId)}`, {
        cache: 'no-store',
      })
      if (!res.ok) return
      const payload = await res.json()
      setItems(Array.isArray(payload.entries) ? (payload.entries as MemoryItem[]) : [])
    } catch {
      setError('Unable to load shared archive entries.')
    } finally {
      setLoading(false)
    }
  }, [configured, activeSpaceId, refreshLocalMemories])

  React.useEffect(() => {
    if (spaceLoading) return
    if (!configured) {
      Promise.resolve().then(refreshLocalMemories)
      return subscribeLocalSanctuary(refreshLocalMemories)
    }
    if (!activeSpaceId) {
      Promise.resolve().then(() => {
        setItems([])
        setLoading(false)
      })
      return
    }

    let active = true
    fetch(`/api/memories?spaceId=${encodeURIComponent(activeSpaceId)}`, {
      cache: 'no-store',
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (!active || !payload) return
        setItems(Array.isArray(payload.entries) ? (payload.entries as MemoryItem[]) : [])
      })
      .catch(() => {
        if (active) setError('Unable to load shared archive entries.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [configured, spaceLoading, activeSpaceId, refreshLocalMemories])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    setError(null)

    if (!configured) {
      createLocalMemory(targetSpaceId, {
        type: itemType,
        title: newTitle.trim(),
        content: newDesc.trim(),
        entryDate: newDate,
        isShared: itemType !== 'journal',
        actor: demoActor,
      })
      setNewTitle('')
      setNewDesc('')
      setIsCreating(false)
      refreshLocalMemories()
      return
    }
    if (!activeSpaceId) return

    setSaving(true)
    try {
      const res = await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spaceId: activeSpaceId,
          kind: itemType,
          title: newTitle.trim(),
          content: newDesc.trim(),
        }),
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok) {
        setError(payload?.detail || payload?.error || 'Could not save archive entry.')
        return
      }
      setNewTitle('')
      setNewDesc('')
      setIsCreating(false)
      await loadEntries()
    } catch {
      setError('Failed to save archive entry.')
    } finally {
      setSaving(false)
    }
  }

  const handleShareJournal = async (item: MemoryItem) => {
    if (!configured) {
      updateLocalMemory(targetSpaceId, item.id, { isShared: true })
      setSelectedItem(null)
      refreshLocalMemories()
      return
    }
    await fetch(`/api/memories/${encodeURIComponent(item.kind)}/${encodeURIComponent(item.id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isShared: true }),
    }).catch(() => {})
    setSelectedItem(null)
    await loadEntries()
  }

  const handleSaveEditSelected = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedItem || !editTitle.trim() || configured) return
    const updated = updateLocalMemory(targetSpaceId, selectedItem.id, {
      title: editTitle.trim(),
      content: editDesc.trim(),
    })
    if (updated) {
      setSelectedItem(mapLocalMemoryToItem(updated, demoActor))
    }
    setEditingSelected(false)
    refreshLocalMemories()
  }

  const handleDelete = async (item: MemoryItem) => {
    if (!configured) {
      deleteLocalMemory(targetSpaceId, item.id)
      if (selectedItem?.id === item.id) setSelectedItem(null)
      refreshLocalMemories()
      return
    }
    const res = await fetch(
      `/api/memories/${encodeURIComponent(item.kind)}/${encodeURIComponent(item.id)}`,
      { method: 'DELETE' },
    )
    if (res.ok) {
      if (selectedItem?.id === item.id) setSelectedItem(null)
      await loadEntries()
    }
  }

  const filtered = items.filter((item) => {
    if (activeTab === 'memories' && (item.isLetter || item.isPrivateJournal)) return false
    if (activeTab === 'letters' && !item.isLetter) return false
    if (activeTab === 'journal' && !item.isPrivateJournal) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      return item.title.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)
    }
    return true
  })

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-8">
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
            Preserve milestones, write digital love letters, or reflect privately with row-level isolation.
          </p>
        </div>

        <Button
          onClick={() => setIsCreating(true)}
          variant="primary"
          size="sm"
          disabled={configured && !activeSpaceId}
        >
          <Plus className="h-4 w-4 mr-1.5" />
          <span>New Entry</span>
        </Button>
      </div>

      {error && (
        <StatusBanner tone="error" title="Archive Issue" description={error} />
      )}

      {configured && !activeSpaceId && (
        <StatusBanner
          tone="info"
          title="No Private Space Selected"
          description="Create or join a space on Sanctuary Home to start saving shared memories, letters, and solo journals."
        />
      )}

      {/* Filter Tabs + Search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {(
            [
              { id: 'all', label: 'All Entries' },
              { id: 'memories', label: 'Shared Moments' },
              { id: 'letters', label: 'Digital Letters' },
              { id: 'journal', label: 'Private Journal (Only You)' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
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

        <div className="relative w-full sm:w-64">
          <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search archive..."
            className="w-full h-9 rounded-full border border-[var(--border)] bg-[var(--card)] pl-8 pr-3 text-xs text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          />
        </div>
      </div>

      {/* Create Form */}
      {isCreating && (
        <form
          onSubmit={handleCreate}
          className="p-6 rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] space-y-4 shadow-xs"
        >
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
            <h3 className="font-semibold text-sm text-[var(--foreground)]">
              Create New Archive Entry
            </h3>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="text-xs text-[var(--muted-foreground)] hover:underline"
            >
              Cancel
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[var(--muted-foreground)]">Type:</span>
            <button
              type="button"
              onClick={() => setItemType('memory')}
              className={`px-2.5 py-1 rounded-full border cursor-pointer ${
                itemType === 'memory'
                  ? 'bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)]'
                  : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
              }`}
            >
              Shared Memory
            </button>
            <button
              type="button"
              onClick={() => setItemType('letter')}
              className={`px-2.5 py-1 rounded-full border cursor-pointer ${
                itemType === 'letter'
                  ? 'bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)]'
                  : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
              }`}
            >
              Digital Love Letter
            </button>
            <button
              type="button"
              onClick={() => setItemType('journal')}
              className={`px-2.5 py-1 rounded-full border cursor-pointer ${
                itemType === 'journal'
                  ? 'bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)]'
                  : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
              }`}
            >
              Private Journal (Strict Solo)
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
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
              <label className="text-xs font-medium text-[var(--foreground)]">Date</label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full text-sm rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--background)] p-2.5 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              />
            </div>
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
            <Button type="submit" variant="primary" size="sm" isLoading={saving}>
              Save Entry
            </Button>
          </div>
        </form>
      )}

      {/* Memories List */}
      {loading ? (
        <div className="py-12 text-center text-xs text-[var(--muted-foreground)]">
          Loading sanctuary archive...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] p-8 text-center text-xs text-[var(--muted-foreground)]">
          No entries in this view yet. Click &ldquo;New Entry&rdquo; to preserve a memory, write a letter, or record a private thought.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] p-6 space-y-4 hover:border-[var(--primary)]/70 transition-all flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
                  <span className="font-mono">
                    {item.date ? new Date(item.date).toLocaleDateString() : ''}
                  </span>
                  {item.isPrivateJournal ? (
                    <Badge
                      variant="outline"
                      className="text-[11px] text-amber-600 dark:text-amber-400 border-amber-500/30"
                    >
                      <Lock className="h-3 w-3 mr-1" />
                      Private Journal (Only You)
                    </Badge>
                  ) : item.isLetter ? (
                    <Badge
                      variant="outline"
                      className="text-[11px] text-purple-600 dark:text-purple-400 border-purple-500/30"
                    >
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

                <p className="text-xs sm:text-sm text-[var(--muted-foreground)] leading-relaxed font-light line-clamp-3">
                  {item.description}
                </p>
              </div>

              <div className="pt-4 border-t border-[var(--border)]/70 flex items-center justify-between text-xs text-[var(--muted-foreground)]">
                <span>{item.isPrivateJournal ? 'Private to Author' : 'Shared in Space'}</span>
                <div className="flex items-center gap-3">
                  {item.isPrivateJournal && (
                    <button
                      type="button"
                      onClick={() => void handleShareJournal(item)}
                      className="inline-flex items-center gap-1 hover:text-[var(--foreground)] cursor-pointer"
                      title="Share with partner"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      <span>Share</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedItem(item)
                      setEditingSelected(false)
                      setEditTitle(item.title)
                      setEditDesc(item.description)
                    }}
                    className="text-[var(--primary)] hover:underline cursor-pointer"
                  >
                    Read full note &rarr;
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full Note Reader / Editor Modal */}
      {selectedItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={selectedItem.title}
          onClick={() => {
            setSelectedItem(null)
            setEditingSelected(false)
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-lg w-full rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] p-6 space-y-5 shadow-lg"
          >
            {editingSelected ? (
              <form onSubmit={handleSaveEditSelected} className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wider">
                    Edit Archive Entry
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditingSelected(false)}
                    className="text-xs text-[var(--muted-foreground)] hover:underline cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full text-sm rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--background)] p-2.5"
                />
                <textarea
                  required
                  rows={5}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full text-sm rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--background)] p-2.5 resize-none"
                />
                <div className="flex justify-end gap-2">
                  <Button type="submit" variant="primary" size="sm">
                    Save Changes
                  </Button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <Badge variant="outline" className="text-[11px]">
                      {selectedItem.tag}
                    </Badge>
                    <h2 className="font-[family-name:var(--ds-font-display)] text-2xl font-bold text-[var(--foreground)]">
                      {selectedItem.title}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedItem(null)}
                    aria-label="Close note"
                    className="p-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)] cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <p className="text-sm text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">
                  {selectedItem.description}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-[var(--border)]">
                  <span className="text-xs text-[var(--muted-foreground)]">
                    {selectedItem.isPrivateJournal ? 'Visible only to author' : 'Shared in sanctuary'}
                  </span>
                  <div className="flex items-center gap-2">
                    {!configured && selectedItem.isOwn && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingSelected(true)}
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1" />
                        <span>Edit</span>
                      </Button>
                    )}
                    {(selectedItem.isOwn || !configured) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleDelete(selectedItem)}
                        className="text-rose-600 hover:text-rose-700"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        <span>Delete</span>
                      </Button>
                    )}
                    <Button type="button" variant="primary" size="sm" onClick={() => setSelectedItem(null)}>
                      Close
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
