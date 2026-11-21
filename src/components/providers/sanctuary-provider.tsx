'use client'

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  type DemoActor,
  type LocalSanctuaryState,
  createLocalInvite,
  createLocalSpace,
  getLocalSanctuaryState,
  renameLocalSpace,
  setLocalDemoActor,
  setLocalMood,
  subscribeLocalSanctuary,
} from '@/lib/sanctuary/local-store'

export interface SpaceMemberSummary {
  userId: string
  role: string
  displayName: string
  avatarUrl?: string | null
  joinedAt?: string | null
}

export interface SanctuarySpace {
  id: string
  name: string
  myRole?: string
  members?: SpaceMemberSummary[]
  partner?: SpaceMemberSummary | null
  myMood?: string | null
  partnerMood?: string | null
  matrixRoomId?: string | null
  pendingInviteUrl?: string | null
  createdAt?: string | null
}

interface SanctuaryContextValue {
  configured: boolean
  isLocalSandbox: boolean
  loading: boolean
  currentUserId: string | null
  demoActor: DemoActor
  setDemoActor: (actor: DemoActor) => void
  spaces: SanctuarySpace[]
  activeSpace: SanctuarySpace | null
  activeSpaceId: string | null
  setActiveSpaceId: (spaceId: string) => void
  refreshSpaces: () => Promise<void>
  createSpace: (name: string, partnerName?: string) => Promise<SanctuarySpace>
  renameSpace: (spaceId: string, name: string, partnerName?: string) => Promise<void>
  createInvite: (spaceId?: string) => Promise<{ inviteUrl: string; expiresAt?: string }>
  setMood: (mood: string, spaceId?: string) => Promise<void>
}

const ACTIVE_SPACE_STORAGE_KEY = 'sanctuary:active-space-id'

const SanctuaryContext = createContext<SanctuaryContextValue | null>(null)

function extractMessagesSpaceId(pathname: string): string | null {
  const match = /^\/messages\/([^/]+)/.exec(pathname)
  return match?.[1] ?? null
}

function mapLocalStateToSpaces(localState: LocalSanctuaryState): SanctuarySpace[] {
  const actor = localState.demoActor
  const selfName = localState.profile.selfDisplayName || 'You'
  return localState.spaces.map((s) => {
    const partnerDisplayName = s.partnerName || localState.profile.partnerDisplayName || 'Partner'
    const myDisplay = actor === 'self' ? selfName : partnerDisplayName
    const otherDisplay = actor === 'self' ? partnerDisplayName : selfName
    const selfMember: SpaceMemberSummary = {
      userId: `local-${actor}`,
      role: actor === 'self' ? 'owner' : 'partner',
      displayName: myDisplay,
    }
    const partnerMember: SpaceMemberSummary = {
      userId: `local-${actor === 'self' ? 'partner' : 'self'}`,
      role: actor === 'self' ? 'partner' : 'owner',
      displayName: otherDisplay,
    }
    return {
      id: s.id,
      name: s.name,
      myRole: selfMember.role,
      members: [selfMember, partnerMember],
      partner: partnerMember,
      myMood: actor === 'self' ? s.myMood : s.partnerMood,
      partnerMood: actor === 'self' ? s.partnerMood : s.myMood,
      pendingInviteUrl: s.pendingInviteUrl ?? null,
      createdAt: s.createdAt,
    }
  })
}

export function SanctuaryProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const pathnameRef = useRef(pathname)

  useEffect(() => {
    pathnameRef.current = pathname
  }, [pathname])

  const [configured, setConfigured] = useState(false)
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [demoActor, setDemoActorState] = useState<DemoActor>('self')
  const [spaces, setSpaces] = useState<SanctuarySpace[]>([])
  const [activeSpaceId, setActiveSpaceIdState] = useState<string | null>(null)

  const chooseInitialSpaceId = useCallback((loadedSpaces: SanctuarySpace[]) => {
    const urlSpaceId = extractMessagesSpaceId(pathnameRef.current)
    const storedId =
      typeof window !== 'undefined'
        ? window.localStorage.getItem(ACTIVE_SPACE_STORAGE_KEY)
        : null
    setActiveSpaceIdState((prev) => {
      const candidates = [urlSpaceId, prev, storedId, loadedSpaces[0]?.id ?? null]
      for (const candidate of candidates) {
        if (candidate && loadedSpaces.some((s) => s.id === candidate)) {
          return candidate
        }
      }
      return loadedSpaces[0]?.id ?? null
    })
  }, [])

  const applyLocalWorkspace = useCallback(() => {
    const localState = getLocalSanctuaryState()
    const mapped = mapLocalStateToSpaces(localState)
    setConfigured(false)
    setDemoActorState(localState.demoActor)
    setCurrentUserId(`local-${localState.demoActor}`)
    setSpaces(mapped)
    chooseInitialSpaceId(mapped)
  }, [chooseInitialSpaceId])

  const applyLoadedSpaces = useCallback(
    (data: { configured?: boolean; currentUserId?: string | null; spaces?: unknown }) => {
      if (!data.configured) {
        applyLocalWorkspace()
        return
      }
      const loadedSpaces: SanctuarySpace[] = Array.isArray(data.spaces)
        ? (data.spaces as SanctuarySpace[])
        : []
      setConfigured(true)
      setCurrentUserId(data.currentUserId ?? null)
      setSpaces(loadedSpaces)
      chooseInitialSpaceId(loadedSpaces)
    },
    [applyLocalWorkspace, chooseInitialSpaceId],
  )

  const refreshSpaces = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/spaces', { cache: 'no-store' })
      if (!res.ok) {
        applyLocalWorkspace()
        return
      }
      const data = await res.json()
      applyLoadedSpaces(data)
    } catch {
      applyLocalWorkspace()
    } finally {
      setLoading(false)
    }
  }, [applyLoadedSpaces, applyLocalWorkspace])

  useEffect(() => {
    let active = true
    fetch('/api/spaces', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active) return
        if (!data) {
          applyLocalWorkspace()
        } else {
          applyLoadedSpaces(data)
        }
      })
      .catch(() => {
        if (active) applyLocalWorkspace()
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [applyLoadedSpaces, applyLocalWorkspace])

  useEffect(() => {
    if (loading || configured) return
    return subscribeLocalSanctuary(() => {
      applyLocalWorkspace()
    })
  }, [loading, configured, applyLocalWorkspace])

  const isLocalSandbox = !loading && !configured
  const urlSpaceId = extractMessagesSpaceId(pathname)
  const resolvedSpaceId =
    urlSpaceId && spaces.some((s) => s.id === urlSpaceId) ? urlSpaceId : activeSpaceId

  // Persist URL-selected space ID to localStorage without cascading state updates
  useEffect(() => {
    if (urlSpaceId && spaces.some((s) => s.id === urlSpaceId) && typeof window !== 'undefined') {
      window.localStorage.setItem(ACTIVE_SPACE_STORAGE_KEY, urlSpaceId)
    }
  }, [urlSpaceId, spaces])

  const setActiveSpaceId = useCallback((spaceId: string) => {
    setActiveSpaceIdState(spaceId)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ACTIVE_SPACE_STORAGE_KEY, spaceId)
    }
  }, [])

  const setDemoActor = useCallback(
    (actor: DemoActor) => {
      if (!isLocalSandbox) return
      setLocalDemoActor(actor)
      applyLocalWorkspace()
    },
    [isLocalSandbox, applyLocalWorkspace],
  )

  const createSpace = useCallback(
    async (name: string, partnerName?: string): Promise<SanctuarySpace> => {
      if (!configured) {
        const { space } = createLocalSpace(name, partnerName)
        applyLocalWorkspace()
        setActiveSpaceId(space.id)
        const mapped = mapLocalStateToSpaces(getLocalSanctuaryState()).find((s) => s.id === space.id)
        return mapped ?? { id: space.id, name: space.name }
      }
      const res = await fetch('/api/spaces/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const payload = await res.json()
      if (!res.ok) {
        throw new Error(payload?.detail || payload?.error || 'Could not create space')
      }
      await refreshSpaces()
      if (payload?.space?.id) {
        setActiveSpaceId(payload.space.id)
      }
      return payload.space as SanctuarySpace
    },
    [configured, applyLocalWorkspace, refreshSpaces, setActiveSpaceId],
  )

  const renameSpace = useCallback(
    async (spaceId: string, name: string, partnerName?: string) => {
      if (!configured) {
        renameLocalSpace(spaceId, name, partnerName)
        applyLocalWorkspace()
      }
    },
    [configured, applyLocalWorkspace],
  )

  const createInvite = useCallback(
    async (spaceId?: string): Promise<{ inviteUrl: string; expiresAt?: string }> => {
      const targetSpaceId = spaceId ?? resolvedSpaceId ?? activeSpaceId
      if (!targetSpaceId) {
        throw new Error('Create or select a sanctuary space first.')
      }
      if (!configured) {
        const { invite, inviteUrl } = createLocalInvite(targetSpaceId)
        applyLocalWorkspace()
        return { inviteUrl, expiresAt: invite.expiresAt }
      }
      const res = await fetch('/api/spaces/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spaceId: targetSpaceId }),
      })
      const payload = await res.json()
      if (!res.ok) {
        throw new Error(payload?.detail || payload?.error || 'Could not generate invite')
      }
      await refreshSpaces()
      return {
        inviteUrl: payload.inviteUrl as string,
        expiresAt: payload.invite?.expires_at as string | undefined,
      }
    },
    [configured, resolvedSpaceId, activeSpaceId, applyLocalWorkspace, refreshSpaces],
  )

  const setMood = useCallback(
    async (mood: string, spaceId?: string) => {
      const targetSpaceId = spaceId ?? resolvedSpaceId ?? activeSpaceId
      if (!targetSpaceId) return

      if (!configured) {
        setLocalMood(targetSpaceId, mood)
        applyLocalWorkspace()
        return
      }

      setSpaces((prev) =>
        prev.map((s) => (s.id === targetSpaceId ? { ...s, myMood: mood } : s)),
      )

      const res = await fetch('/api/spaces/mood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spaceId: targetSpaceId, mood }),
      })
      if (!res.ok) {
        await refreshSpaces()
      }
    },
    [configured, resolvedSpaceId, activeSpaceId, applyLocalWorkspace, refreshSpaces],
  )

  const activeSpace =
    spaces.find((s) => s.id === resolvedSpaceId) ?? spaces[0] ?? null

  return (
    <SanctuaryContext.Provider
      value={{
        configured,
        isLocalSandbox,
        loading,
        currentUserId,
        demoActor,
        setDemoActor,
        spaces,
        activeSpace,
        activeSpaceId: activeSpace?.id ?? null,
        setActiveSpaceId,
        refreshSpaces,
        createSpace,
        renameSpace,
        createInvite,
        setMood,
      }}
    >
      {children}
    </SanctuaryContext.Provider>
  )
}

export function useSanctuary(): SanctuaryContextValue {
  const ctx = useContext(SanctuaryContext)
  if (!ctx) {
    throw new Error('useSanctuary must be used inside SanctuaryProvider')
  }
  return ctx
}
