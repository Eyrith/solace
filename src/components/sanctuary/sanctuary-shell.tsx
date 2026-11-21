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
  } = useSanctuary()

  React.useEffect(() => {
    setEnvironment('private')
  }, [setEnvironment])

  const shellSpaces: PrivateSpaceSummary[] = spaces.map((s) => ({
    id: s.id,
    label: s.name,
    partnerName: s.partner?.displayName ?? 'Partner pending',
  }))

  const handleSwitchSpace = (spaceId: string) => {
    setActiveSpaceId(spaceId)
    if (pathname.startsWith('/messages')) {
      router.push(`/messages/${spaceId}`)
    }
  }

  const handleCreateSpace = async (name: string) => {
    const created = await createSpace(name)
    if (pathname.startsWith('/messages')) {
      router.push(`/messages/${created.id}`)
    }
  }

  // On standalone auth/invite entry routes, keep children distraction-free.
  const isEntryRoute =
    pathname.startsWith('/sanctuary/login') ||
    pathname.startsWith('/sanctuary/register') ||
    pathname.startsWith('/invite/')

  if (isEntryRoute) {
    return <>{children}</>
  }

  const sandboxSubtitle =
    demoActor === 'partner'
      ? 'Local Sandbox · Viewing as Partner (saved in browser)'
      : 'Local Sandbox · Saved in browser'

  return (
    <PrivateShell
      spaces={shellSpaces}
      activeSpaceId={activeSpaceId ?? undefined}
      onSwitchSpace={handleSwitchSpace}
      onCreateSpace={handleCreateSpace}
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

