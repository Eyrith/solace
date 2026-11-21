'use client'

import { useEffect, useState } from 'react'
import { isSupabaseClientConfigured } from '@/lib/supabase/client'

const STORAGE_SAVED_KEY = 'project00_editorial_saved_ids'
const STORAGE_HISTORY_KEY = 'project00_editorial_history'
const STORAGE_HISTORY_ENABLED_KEY = 'project00_editorial_history_enabled'
const STORAGE_NOTES_KEY = 'project00_editorial_notes'
const LIBRARY_CHANGE_EVENT = 'project00_editorial_library_changed'

export interface HistoryItem {
  articleId: string
  readAt: string
}

function broadcastLibraryChange() {
  if (typeof window === 'undefined') return
  queueMicrotask(() => {
    window.dispatchEvent(new CustomEvent(LIBRARY_CHANGE_EVENT))
  })
}

function readStoredJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function useEditorialLibrary() {
  const [savedIds, setSavedIds] = useState<string[]>([])
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [historyEnabled, setHistoryEnabled] = useState<boolean>(true)
  const [notesByArticle, setNotesByArticle] = useState<Record<string, string>>({})
  const [isLoaded, setIsLoaded] = useState<boolean>(false)
  const [serverSynced, setServerSynced] = useState<boolean>(false)

  useEffect(() => {
    let active = true

    const readFromLocalStorage = () => {
      if (!active) return
      try {
        const savedRaw = localStorage.getItem(STORAGE_SAVED_KEY)
        if (savedRaw) setSavedIds(JSON.parse(savedRaw))

        const historyRaw = localStorage.getItem(STORAGE_HISTORY_KEY)
        if (historyRaw) setHistory(JSON.parse(historyRaw))

        const enabledRaw = localStorage.getItem(STORAGE_HISTORY_ENABLED_KEY)
        if (enabledRaw !== null) setHistoryEnabled(JSON.parse(enabledRaw))

        const notesRaw = localStorage.getItem(STORAGE_NOTES_KEY)
        if (notesRaw) setNotesByArticle(JSON.parse(notesRaw))
      } catch {
        // Storage unavailable or blocked
      } finally {
        setIsLoaded(true)
      }
    }

    Promise.resolve().then(readFromLocalStorage)

    const onLibraryChanged = () => readFromLocalStorage()
    if (typeof window !== 'undefined') {
      window.addEventListener(LIBRARY_CHANGE_EVENT, onLibraryChanged)
    }

    if (!isSupabaseClientConfigured()) {
      return () => {
        active = false
        if (typeof window !== 'undefined') {
          window.removeEventListener(LIBRARY_CHANGE_EVENT, onLibraryChanged)
        }
      }
    }

    Promise.all([
      fetch('/api/editorial/saved', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)),
      fetch('/api/editorial/history', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)),
      fetch('/api/account/preferences', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([savedRes, historyRes, prefsRes]) => {
        if (!active) return
        if (savedRes?.authenticated) {
          setServerSynced(true)
          const remoteSaved: string[] = Array.isArray(savedRes.savedIds) ? savedRes.savedIds : []
          setSavedIds((prev) => Array.from(new Set([...remoteSaved, ...prev])))
        }
        if (historyRes?.authenticated && Array.isArray(historyRes.history)) {
          setServerSynced(true)
          const remoteHist = historyRes.history as HistoryItem[]
          setHistory((prev) => {
            const seen = new Set(remoteHist.map((h) => h.articleId))
            return [...remoteHist, ...prev.filter((p) => !seen.has(p.articleId))].slice(0, 50)
          })
        }
        if (typeof prefsRes?.preferences?.reading_history_enabled === 'boolean') {
          setHistoryEnabled(prefsRes.preferences.reading_history_enabled)
        }
      })
      .catch(() => {})

    return () => {
      active = false
      if (typeof window !== 'undefined') {
        window.removeEventListener(LIBRARY_CHANGE_EVENT, onLibraryChanged)
      }
    }
  }, [])

  const toggleSave = (articleId: string) => {
    const current = readStoredJson<string[]>(STORAGE_SAVED_KEY, savedIds)
    const next = current.includes(articleId)
      ? current.filter((id) => id !== articleId)
      : [...current, articleId]

    try {
      localStorage.setItem(STORAGE_SAVED_KEY, JSON.stringify(next))
    } catch {}
    setSavedIds(next)
    broadcastLibraryChange()

    if (isSupabaseClientConfigured()) {
      void fetch('/api/editorial/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId }),
      }).catch(() => {})
    }
  }

  const isSaved = (articleId: string) => savedIds.includes(articleId)

  const getArticleNote = (articleId: string) => notesByArticle[articleId] ?? ''

  const setArticleNote = (articleId: string, note: string) => {
    const current = readStoredJson<Record<string, string>>(STORAGE_NOTES_KEY, notesByArticle)
    const next = { ...current }
    if (note.trim()) {
      next[articleId] = note
    } else {
      delete next[articleId]
    }
    try {
      localStorage.setItem(STORAGE_NOTES_KEY, JSON.stringify(next))
    } catch {}
    setNotesByArticle(next)
    broadcastLibraryChange()
  }

  const recordRead = (articleId: string) => {
    if (!historyEnabled) return

    const current = readStoredJson<HistoryItem[]>(STORAGE_HISTORY_KEY, history)
    const filtered = current.filter((item) => item.articleId !== articleId)
    const next = [{ articleId, readAt: new Date().toISOString() }, ...filtered].slice(0, 50)

    try {
      localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(next))
    } catch {}
    setHistory(next)
    broadcastLibraryChange()

    if (isSupabaseClientConfigured()) {
      void fetch('/api/editorial/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId }),
      }).catch(() => {})
    }
  }

  const setHistoryTracking = (enabled: boolean) => {
    setHistoryEnabled(enabled)
    try {
      localStorage.setItem(STORAGE_HISTORY_ENABLED_KEY, JSON.stringify(enabled))
    } catch {}
    broadcastLibraryChange()

    if (isSupabaseClientConfigured()) {
      void fetch('/api/account/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ readingHistoryEnabled: enabled }),
      }).catch(() => {})
    }
  }

  const clearHistory = () => {
    setHistory([])
    try {
      localStorage.removeItem(STORAGE_HISTORY_KEY)
    } catch {}
    broadcastLibraryChange()

    if (isSupabaseClientConfigured()) {
      void fetch('/api/editorial/history', { method: 'DELETE' }).catch(() => {})
    }
  }

  return {
    savedIds,
    history,
    historyEnabled,
    notesByArticle,
    isLoaded,
    serverSynced,
    toggleSave,
    isSaved,
    getArticleNote,
    setArticleNote,
    recordRead,
    setHistoryTracking,
    clearHistory,
  }
}
