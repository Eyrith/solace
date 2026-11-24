'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Compass, Users, Phone, Sparkles } from 'lucide-react'
import { CoOpVessel } from '@/components/sanctuary/games/co-op-vessel'
import { CallCompanionBar } from '@/components/sanctuary/calls/call-companion-bar'
import { useSanctuary } from '@/components/providers/sanctuary-provider'
import { Button } from '@/components/ui/button'

export default function CoOpGamePage() {
  const router = useRouter()
  const { activeSpace, spaces } = useSanctuary()
  const currentSpace = activeSpace ?? spaces[0] ?? null
  const partnerName =
    currentSpace?.partner?.displayName || currentSpace?.name || 'Partner'

  const [inCall, setInCall] = React.useState(true)

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex flex-col items-center justify-start px-3 py-4 sm:py-8 space-y-4">
      {/* Floating Kulfi Call Companion Bar */}
      <CallCompanionBar
        partnerName={partnerName}
        isInCall={inCall}
        activeGameTitle="Two-Boat River · Co-Op"
        onEndCall={() => setInCall(false)}
      />

      {/* Main Container */}
      <div className="w-full max-w-xl mx-auto space-y-3">
        <div className="flex items-center justify-between px-2">
          <Link
            href="/games"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Bedtime Parlour</span>
          </Link>

          {!inCall && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInCall(true)}
              className="text-xs rounded-full border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
            >
              <Phone className="h-3 w-3 mr-1" />
              <span>Connect Call Bar</span>
            </Button>
          )}
        </div>

        {/* The Co-Op Game */}
        <CoOpVessel
          spaceId={currentSpace?.id ?? 'space-1'}
          partnerName={partnerName}
          onBack={() => router.push('/games')}
        />
      </div>
    </div>
  )
}
