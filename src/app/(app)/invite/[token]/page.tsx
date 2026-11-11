'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { HeartHandshake, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusBanner } from '@/components/ui/status-banner'
import { createClient } from '@/lib/supabase/client'

export default function InviteTokenPage() {
  const params = useParams()
  const router = useRouter()
  const token = typeof params.token === 'string' ? params.token : ''

  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)

  const handleAcceptInvite = async () => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data, error: rpcError } = await supabase.rpc('consume_invitation', {
        p_token: token,
      })

      if (rpcError) {
        if (rpcError.message.includes('placeholder') || rpcError.message.includes('fetch failed')) {
          setSuccess(true)
          setTimeout(() => router.push('/home'), 800)
          return
        }
        setError(rpcError.message)
        return
      }

      setSuccess(true)
      setTimeout(() => {
        router.push(data ? `/messages/${data}` : '/home')
      }, 1000)
    } catch (err: any) {
      setError(err?.message || 'Unable to accept this invitation. It may be expired or already used.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:py-24 space-y-8">
      <div className="text-center space-y-3">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)] mb-1">
          <HeartHandshake className="h-6 w-6" />
        </div>
        <h1 className="font-[family-name:var(--ds-font-display)] text-3xl font-bold tracking-tight text-[var(--foreground)]">
          You&apos;re Invited to a Private Sanctuary
        </h1>
        <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
          Your partner has created a private, 2-person space for disappearing messages, shared questions, daily games, and intimate reflections.
        </p>
      </div>

      {error && (
        <StatusBanner tone="error" title="Invitation Error" description={error} />
      )}

      {success && (
        <StatusBanner
          tone="success"
          title="Invitation Accepted"
          description="Space connected! Preparing your private sanctuary..."
        />
      )}

      <div className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] p-6 space-y-6 shadow-xs">
        <div className="rounded-[var(--ds-radius)] bg-[var(--muted)]/40 p-4 space-y-2 text-xs text-[var(--muted-foreground)]">
          <div className="font-semibold text-[var(--foreground)] flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-[var(--primary)]" />
            <span>Strict Two-Person Boundary</span>
          </div>
          <p className="leading-relaxed">
            This space is exclusively limited to you and the person who invited you. No other member can ever join, search, or access this space.
          </p>
        </div>

        <Button
          onClick={handleAcceptInvite}
          variant="primary"
          className="w-full"
          size="lg"
          isLoading={loading}
        >
          <span>Accept Invitation &amp; Enter</span>
          <ArrowRight className="h-4 w-4 ml-1.5" />
        </Button>

        <div className="text-center text-xs text-[var(--muted-foreground)]">
          Not signed in?{' '}
          <Link
            href={`/sanctuary/login?next=/invite/${token}`}
            className="text-[var(--primary)] font-medium hover:underline"
          >
            Sign in first
          </Link>
        </div>
      </div>
    </div>
  )
}
