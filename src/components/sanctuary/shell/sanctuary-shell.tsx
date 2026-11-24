'use client'

import React from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { PrivateShell, type PrivateSpaceSummary } from '@/components/sanctuary/private-shell'
import { useSanctuary } from '@/components/providers/sanctuary-provider'
import { useDesignSystem } from '@/components/providers/design-system-provider'

export function SanctuaryShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? ''
  const router = useRouter()
  const { setEnvironment } = useDesignSystem()
  const {
    spaces,
    activeSpaceId,
    setActiveSpaceId,
    configured,
    isLocalSandbox,
    loading,
    demoActor,
    setDemoActor,
    createSpace,
    createInvite,
  } = useSanctuary()

  React.useEffect(() => {
    setEnvironment('private')
  }, [setEnvironment])

  // Hard-lock to 1:1 only: An account can only have 1 private sanctuary space
  const shellSpaces: PrivateSpaceSummary[] = spaces.slice(0, 1).map((s) => ({
    id: s.id,
    label: s.name,
    partnerName: s.partner?.displayName ?? 'Partner pending',
    isPaired: Boolean(
      s.partner &&
      s.partner.displayName !== 'Partner pending' &&
      !s.pendingInviteUrl
    ),
    camouflageAlias: s.camouflageAlias ?? undefined,
    burnTimer: s.burnTimer ?? undefined,
  }))

  const handleSwitchSpace = (spaceId: string) => {
    setActiveSpaceId(spaceId)
    if (pathname.startsWith('/messages')) {
      router.push('/messages')
    }
  }

  const handleCreateSpace = async (
    name: string,
    partnerName?: string,
    camouflageAlias?: string,
    burnTimer?: string
  ) => {
    const created = await createSpace(name, partnerName, camouflageAlias, burnTimer)
    if (pathname.startsWith('/messages')) {
      router.push('/messages')
    }
  }

  const handleGenerateInvite = async (spaceId?: string) => {
    return await createInvite(spaceId)
  }

  // On standalone auth/invite entry routes, keep children distraction-free.
  const isEntryRoute =
    pathname.startsWith('/sanctuary/login') ||
    pathname.startsWith('/sanctuary/register') ||
    pathname.startsWith('/invite/')

  if (isEntryRoute) {
    return <>{children}</>
  }

  const sandboxSubtitle = 'Private 1:1'

  return (
    <PrivateShell
      spaces={shellSpaces}
      activeSpaceId={activeSpaceId ?? undefined}
      onSwitchSpace={handleSwitchSpace}
      onCreateSpace={handleCreateSpace}
      onGenerateInvite={handleGenerateInvite}
      isLocalSandbox={isLocalSandbox}
      demoActor={demoActor}
      onSwitchDemoActor={setDemoActor}
      headerSubtitle={
        loading
          ? 'Syncing sanctuary...'
          : !configured
            ? sandboxSubtitle
            : undefined
      }
    >
      {children}
    </PrivateShell>
  )
}

