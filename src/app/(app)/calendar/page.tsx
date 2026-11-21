'use client'

import * as React from 'react'
import {
  Calendar as CalendarIcon,
  Heart,
  Plus,
  Bell,
  Clock,
  Gift,
  Pencil,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatusBanner } from '@/components/ui/status-banner'
import { daysUntilDate } from '@/lib/utils'
import { useSanctuary } from '@/components/providers/sanctuary-provider'
import {
  type LocalCalendarEvent,
  createLocalCalendarEvent,
  deleteLocalCalendarEvent,
  listLocalCalendarEvents,
  subscribeLocalSanctuary,
  updateLocalCalendarEvent,
} from '@/lib/sanctuary/local-store'

interface EventItem {
  id: string
  title: string
  event_date: string
  event_type?: LocalCalendarEvent['eventType']
  is_anniversary?: boolean
  description?: string | null
}

function mapLocalCalendarItem(ev: LocalCalendarEvent): EventItem {
  return {
    id: ev.id,
    title: ev.title,
    event_date: ev.eventDate,
    event_type: ev.eventType,
    is_anniversary: ev.recurringYearly,
    description: ev.notes ?? null,
  }
}

export default function CalendarPage() {
  const { activeSpaceId, configured, loading: spaceLoading } = useSanctuary()
  const [events, setEvents] = React.useState<EventItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [isAdding, setIsAdding] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [title, setTitle] = React.useState('')
  const [date, setDate] = React.useState('')
  const [eventType, setEventType] = React.useState<LocalCalendarEvent['eventType']>('date_night')
  const [description, setDescription] = React.useState('')
  const [isAnniv, setIsAnniv] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const targetSpaceId = activeSpaceId ?? 'space-1'

  const refreshLocalEvents = React.useCallback(() => {
    const localItems = listLocalCalendarEvents(targetSpaceId).map(mapLocalCalendarItem)
    setEvents(localItems)
    setLoading(false)
  }, [targetSpaceId])

  const loadEvents = React.useCallback(async () => {
    if (!configured) {
      refreshLocalEvents()
      return
    }
    if (!activeSpaceId) {
      setEvents([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/calendar?spaceId=${encodeURIComponent(activeSpaceId)}`, {
        cache: 'no-store',
      })
      if (!res.ok) return
      const payload = await res.json()
      setEvents(Array.isArray(payload.events) ? (payload.events as EventItem[]) : [])
    } catch {
      setError('Unable to load shared milestones.')
    } finally {
      setLoading(false)
    }
  }, [configured, activeSpaceId, refreshLocalEvents])

  React.useEffect(() => {
    if (spaceLoading) return
    if (!configured) {
      Promise.resolve().then(refreshLocalEvents)
      return subscribeLocalSanctuary(refreshLocalEvents)
    }
    if (!activeSpaceId) {
      Promise.resolve().then(() => {
        setEvents([])
        setLoading(false)
      })
      return
    }

    let active = true
    fetch(`/api/calendar?spaceId=${encodeURIComponent(activeSpaceId)}`, {
      cache: 'no-store',
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (!active || !payload) return
        setEvents(Array.isArray(payload.events) ? (payload.events as EventItem[]) : [])
      })
      .catch(() => {
        if (active) setError('Unable to load shared milestones.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [configured, spaceLoading, activeSpaceId, refreshLocalEvents])

  const resetForm = () => {
    setTitle('')
    setDate('')
    setDescription('')
    setIsAnniv(false)
    setEventType('date_night')
    setEditingId(null)
    setIsAdding(false)
  }

  const handleStartEdit = (ev: EventItem) => {
    setTitle(ev.title)
    setDate(ev.event_date)
    setDescription(ev.description ?? '')
    setIsAnniv(Boolean(ev.is_anniversary))
    setEventType(ev.event_type ?? 'date_night')
    setEditingId(ev.id)
    setIsAdding(true)
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !date) return
    setError(null)

    if (!configured) {
      if (editingId) {
        updateLocalCalendarEvent(targetSpaceId, editingId, {
          title: title.trim(),
          eventDate: date,
          eventType,
          recurringYearly: isAnniv,
          notes: description.trim() || undefined,
        })
      } else {
        createLocalCalendarEvent(targetSpaceId, {
          title: title.trim(),
          eventDate: date,
          eventType,
          recurringYearly: isAnniv,
          notes: description.trim() || undefined,
        })
      }
      resetForm()
      refreshLocalEvents()
      return
    }
    if (!activeSpaceId) return

    setSaving(true)
    try {
      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spaceId: activeSpaceId,
          title: title.trim(),
          description: description.trim() || null,
          eventDate: date,
          isAnniversary: isAnniv,
        }),
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok) {
        setError(payload?.detail || payload?.error || 'Could not save milestone.')
        return
      }
      resetForm()
      await loadEvents()
    } catch {
      setError('Failed to save milestone.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (eventId: string) => {
    if (!configured) {
      deleteLocalCalendarEvent(targetSpaceId, eventId)
      refreshLocalEvents()
      return
    }
    const res = await fetch(`/api/calendar/${encodeURIComponent(eventId)}`, {
      method: 'DELETE',
    })
    if (res.ok) {
      await loadEvents()
    }
  }

  const sortedEvents = React.useMemo(
    () =>
      [...events].sort(
        (a, b) =>
          daysUntilDate(a.event_date, Boolean(a.is_anniversary)) -
          daysUntilDate(b.event_date, Boolean(b.is_anniversary)),
      ),
    [events],
  )

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-8">
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
            Track meaningful milestones and upcoming recurring anniversaries in one shared timeline.
          </p>
        </div>

        <Button
          onClick={() => setIsAdding(true)}
          variant="primary"
          size="sm"
          disabled={configured && !activeSpaceId}
        >
          <Plus className="h-4 w-4 mr-1.5" />
          <span>Add Date</span>
        </Button>
      </div>

      {error && (
        <StatusBanner tone="error" title="Calendar Issue" description={error} />
      )}

      {configured && !activeSpaceId && (
        <StatusBanner
          tone="info"
          title="No Private Space Selected"
          description="Create or join a space on Sanctuary Home to track shared anniversaries and milestones."
        />
      )}

      {/* Add / Edit Date Form */}
      {isAdding && (
        <form
          onSubmit={handleAdd}
          className="p-5 rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">
              {editingId ? 'Edit Milestone' : 'Add New Milestone'}
            </h3>
            <button
              type="button"
              onClick={resetForm}
              className="text-xs text-[var(--muted-foreground)] cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--foreground)]">Category</label>
              <select
                value={eventType}
                onChange={(e) =>
                  setEventType(e.target.value as LocalCalendarEvent['eventType'])
                }
                className="w-full text-xs rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--background)] p-2.5"
              >
                <option value="date_night">Date Night</option>
                <option value="anniversary">Anniversary</option>
                <option value="trip">Trip / Getaway</option>
                <option value="milestone">Milestone</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--foreground)]">
              Description (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A small note about what this date celebrates..."
              className="w-full text-xs rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--background)] p-2.5"
            />
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

          <Button type="submit" variant="primary" size="sm" isLoading={saving}>
            {editingId ? 'Save Changes' : 'Save Milestone'}
          </Button>
        </form>
      )}

      {/* Events Timeline */}
      {loading ? (
        <div className="py-12 text-center text-xs text-[var(--muted-foreground)]">
          Loading shared calendar...
        </div>
      ) : sortedEvents.length === 0 ? (
        <div className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] p-8 text-center text-xs text-[var(--muted-foreground)]">
          No upcoming dates added yet. Add your first anniversary or planned weekend above.
        </div>
      ) : (
        <div className="space-y-4">
          {sortedEvents.map((ev) => {
            const remaining = daysUntilDate(ev.event_date, Boolean(ev.is_anniversary))
            return (
              <div
                key={ev.id}
                className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[var(--primary)] transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
                    {ev.is_anniversary ? <Heart className="h-5 w-5" /> : <Gift className="h-5 w-5" />}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-base text-[var(--foreground)]">
                        {ev.title}
                      </h3>
                      {ev.is_anniversary && (
                        <Badge
                          variant="outline"
                          className="text-[10px] text-[var(--primary)] border-[var(--primary)]/30"
                        >
                          Annual
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-[var(--muted-foreground)] flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{ev.event_date}</span>
                    </div>
                    {ev.description && (
                      <p className="text-xs text-[var(--muted-foreground)] leading-relaxed pt-1">
                        {ev.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-1.5 shrink-0">
                  <div className="text-lg font-mono font-bold text-[var(--primary)]">
                    {remaining === 0 ? 'Today!' : `in ${remaining} days`}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-[var(--muted-foreground)]">
                    <span className="inline-flex items-center gap-1">
                      <Bell className="h-3 w-3" />
                      <span>Active</span>
                    </span>
                    {!configured && (
                      <button
                        type="button"
                        onClick={() => handleStartEdit(ev)}
                        aria-label={`Edit ${ev.title}`}
                        className="p-1 hover:text-[var(--foreground)] cursor-pointer"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void handleDelete(ev.id)}
                      aria-label={`Remove ${ev.title}`}
                      className="p-1 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
