'use client'

import { useEffect, useState } from 'react'

const STORAGE_SAVED_KEY = 'project00_editorial_saved_ids'
const STORAGE_HISTORY_KEY = 'project00_editorial_history'
const STORAGE_HISTORY_ENABLED_KEY = 'project00_editorial_history_enabled'

export interface HistoryItem {
  articleId: string
  readAt: string
}

export function useEditorialLibrary() {
  const [savedIds, setSavedIds] = useState<string[]>([])
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [historyEnabled, setHistoryEnabled] = useState<boolean>(true)
  const [isLoaded, setIsLoaded] = useState<boolean>(false)

  useEffect(() => {
    try {
      const savedRaw = localStorage.getItem(STORAGE_SAVED_KEY)
      if (savedRaw) setSavedIds(JSON.parse(savedRaw))

      const historyRaw = localStorage.getItem(STORAGE_HISTORY_KEY)
      if (historyRaw) setHistory(JSON.parse(historyRaw))

      const enabledRaw = localStorage.getItem(STORAGE_HISTORY_ENABLED_KEY)
      if (enabledRaw !== null) setHistoryEnabled(JSON.parse(enabledRaw))
    } catch {
      // Storage unavailable or blocked
    } finally {
      setIsLoaded(true)
    }
  }, [])

  const toggleSave = (articleId: string) => {
    setSavedIds((prev) => {
      const next = prev.includes(articleId)
        ? prev.filter((id) => id !== articleId)
        : [...prev, articleId]

      try {
        localStorage.setItem(STORAGE_SAVED_KEY, JSON.stringify(next))
      } catch {}
      return next
    })
  }

  const isSaved = (articleId: string) => savedIds.includes(articleId)

  const recordRead = (articleId: string) => {
    if (!historyEnabled) return

    setHistory((prev) => {
      const filtered = prev.filter((item) => item.articleId !== articleId)
      const next = [{ articleId, readAt: new Date().toISOString() }, ...filtered].slice(0, 50)

      try {
        localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(next))
      } catch {}
      return next
    })
  }

  const setHistoryTracking = (enabled: boolean) => {
    setHistoryEnabled(enabled)
    try {
      localStorage.setItem(STORAGE_HISTORY_ENABLED_KEY, JSON.stringify(enabled))
    } catch {}
  }

  const clearHistory = () => {
    setHistory([])
    try {
      localStorage.removeItem(STORAGE_HISTORY_KEY)
    } catch {}
  }

  return {
    savedIds,
    history,
    historyEnabled,
    isLoaded,
    toggleSave,
    isSaved,
    recordRead,
    setHistoryTracking,
    clearHistory,
  }
}
