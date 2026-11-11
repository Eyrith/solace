'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  Calendar as CalendarIcon,
  Sparkles,
  Heart,
  Plus,
  Bell,
  Clock,
  ArrowLeft,
  Gift,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface EventItem {
  id: string
  title: string
  date: string
  isAnniversary?: boolean
  daysRemaining: number
  description?: string
}

const EVENTS: EventItem[] = [
  {
    id: 'e1',
    title: 'Our First Kiss & Date Anniversary',
    date: 'March 14, 2025',
    isAnniversary: true,
    daysRemaining: 18,
    description: 'Celebrating 2 sweet years since that magical evening by the river.',
  },
  {
    id: 'e2',
    title: 'Partner’s Birthday Celebration',
    date: 'April 02, 2025',
    isAnniversary: false,
    daysRemaining: 37,
    description: 'Secret getaway planning underway.',
  },
  {
    id: 'e3',
    title: 'Spring Cabin Weekend',
    date: 'May 20, 2025',
    isAnniversary: false,
    daysRemaining: 85,
    description: 'Zero laptops, lots of tea, fireplace, and hiking boots.',
  },
]

export default function CalendarPage() {
  const [events, setEvents] = React.useState<EventItem[]>(EVENTS)
  const [isAdding, setIsAdding] = React.useState(false)
  const [title, setTitle] = React.useState('')
  const [date, setDate] = React.useState('')
  const [isAnniv, setIsAnniv] = React.useState(false)

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !date) return

    const newEvent: EventItem = {
      id: `ev-${Date.now()}`,
      title,
      date,
      isAnniversary: isAnniv,
      daysRemaining: 30,
    }
    setEvents((prev) => [...prev, newEvent])
    setTitle('')
    setDate('')
    setIsAdding(false)
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-8">
      {/* ── Top Bar ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider font-medium text-[var(--primary)] mb-1">
            <CalendarIcon className="h-3.5 w-3.5" />
            <span>Shared Timetable</span>
          </div>
          <h1 className="font-[family-name:var(--ds-font-display)] text-3xl font-bold tracking-tight text-[var(--foreground)]">
            Important Dates &amp; Anniversaries
          </h1>
          <p className="text-xs sm:text-sm text-[var(--muted-foreground)]">
            Never forget a meaningful milestone. Gentle reminders alert you well in advance.
          </p>
        </div>

        <Button onClick={() => setIsAdding(true)} variant="primary" size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          <span>Add Date</span>
        </Button>
      </div>

      {/* Add Date Form */}
      {isAdding && (
        <form onSubmit={handleAdd} className="p-5 rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">Add New Milestone</h3>
            <button type="button" onClick={() => setIsAdding(false)} className="text-xs text-[var(--muted-foreground)]">
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--foreground)]">Event Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Anniversary or Birthday"
                className="w-full text-xs rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--background)] p-2.5"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--foreground)]">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--background)] p-2.5"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              id="anniv-check"
              checked={isAnniv}
              onChange={(e) => setIsAnniv(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="anniv-check">Mark as recurring annual anniversary</label>
          </div>

          <Button type="submit" variant="primary" size="sm">
            Save Milestone
          </Button>
        </form>
      )}

      {/* ── Events Timeline ─────────────────────────────────────────────────── */}
      <div className="space-y-4">
        {events.map((ev) => (
          <div
            key={ev.id}
            className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[var(--primary)] transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
                {ev.isAnniversary ? <Heart className="h-5 w-5" /> : <Gift className="h-5 w-5" />}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-base text-[var(--foreground)]">
                    {ev.title}
                  </h3>
                  {ev.isAnniversary && (
                    <Badge variant="outline" className="text-[10px] text-[var(--primary)] border-[var(--primary)]/30">
                      Anniversary
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-[var(--muted-foreground)]">{ev.date}</div>
                {ev.description && (
                  <p className="text-xs text-[var(--muted-foreground)]">{ev.description}</p>
                )}
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="text-2xl font-bold font-mono text-[var(--primary)]">
                {ev.daysRemaining} days
              </div>
              <div className="text-[11px] text-[var(--muted-foreground)]">Until celebration</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
