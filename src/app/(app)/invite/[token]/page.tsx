'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { HeartHandshake, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusBanner } from '@/components/ui/status-banner'
import { useSanctuary } from '@/components/providers/sanctuary-provider'
import { inspectLocalInvite, redeemLocalInvite } from '@/lib/sanctuary/local-store'

interface InviteInspection {
  configured: boolean
  valid: boolean
  isUsed?: boolean
  isExpired?: boolean
  isFull?: boolean
  expiresAt?: string | null
  spaceName?: string
  reason?: string
}

export default function InviteTokenPage() {
  const params = useParams()
  const router = useRouter()
  const { refreshSpaces } = useSanctuary()
  const token = typeof params.token === 'string' ? params.token : ''

  const [inspecting, setInspecting] = React.useState(Boolean(token))
  const [inspection, setInspection] = React.useState<InviteInspection | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(
    token ? null : 'No invitation token was supplied.',
  )
  const [success, setSuccess] = React.useState(false)

  React.useEffect(() => {
    if (!token) return
    if (token.startsWith('local-')) {
      Promise.resolve().then(() => {
        const localInv = inspectLocalInvite(token)
        if (!localInv) {
          setError('Local invitation token not found in this browser. Generate a fresh link on Sanctuary Home.')
        } else {
          setInspection({
            configured: true,
            valid: !localInv.redeemed,
            isUsed: Boolean(localInv.redeemed),
            expiresAt: localInv.expiresAt,
            spaceName: localInv.spaceName,
          })
        }
        setInspecting(false)
      })
      return
    }

    let active = true
    fetch(`/api/spaces/invite/${encodeURIComponent(token)}`, { cache: 'no-store' })
      .then(async (res) => {
        const data = await res.json().catch(() => null)
        if (!active) return
        if (!res.ok) {
          setError(data?.detail || data?.error || 'Invitation link was not found.')
          return
        }
        setInspection(data as InviteInspection)
      })
      .catch(() => {
        if (active) setError('Unable to verify invitation right now.')
      })
      .finally(() => {
        if (active) setInspecting(false)
      })
    return () => {
      active = false
    }
  }, [token])

  const handleAcceptInvite = async () => {
    setLoading(true)
    setError(null)

    if (token.startsWith('local-')) {
      const redeemed = redeemLocalInvite(token)
      if (!redeemed) {
        setError('Unable to accept local invitation.')
        setLoading(false)
        return
      }
      setSuccess(true)
      await refreshSpaces()
      router.push(`/messages/${redeemed.space.id}`)
      return
    }

    try {
      const res = await fetch('/api/spaces/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const payload = await res.json().catch(() => null)
      if (res.status === 401) {
        router.push(`/sanctuary/login?next=${encodeURIComponent(`/invite/${token}`)}`)
        return
      }
      if (!res.ok) {
        setError(
          payload?.detail ||
            payload?.error ||
            'Unable to accept this invitation. It may be expired or already used.',
        )
        return
      }

      setSuccess(true)
      await refreshSpaces()
      const spaceId = payload?.spaceId
      router.push(spaceId ? `/messages/${spaceId}` : '/home')
      router.refresh()
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to accept this invitation. It may be expired or already used.',
      )
    } finally {
      setLoading(false)
    }
  }

  const invalidReason =
    inspection && inspection.configured && !inspection.valid
      ? inspection.isFull
        ? 'This private sanctuary already has 2 members and cannot accept another.'
        : inspection.isUsed
          ? 'This single-use invitation link has already been claimed.'
          : inspection.isExpired
            ? 'This invitation link has expired. Ask your partner to generate a fresh link.'
            : 'This invitation link is no longer valid.'
      : null

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:py-24 space-y-8">
      <div className="text-center space-y-3">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)] mb-1">
          <HeartHandshake className="h-6 w-6" />
        </div>
        <h1 className="font-[family-name:var(--ds-font-display)] text-3xl font-bold tracking-tight text-[var(--foreground)]">
          {inspection?.spaceName
            ? `Invited to "${inspection.spaceName}"`
            : "You're Invited to a Private Sanctuary"}
        </h1>
        <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
          Your partner has created a private, 2-person space for disappearing messages, shared questions, daily games, and intimate reflections.
        </p>
      </div>

      {error && (
        <StatusBanner tone="error" title="Invitation Error" description={error} />
      )}

      {!error && invalidReason && (
        <StatusBanner tone="error" title="Invitation Unavailable" description={invalidReason} />
      )}

      {inspection && !inspection.configured && (
        <StatusBanner
          tone="info"
          title="Backend Not Configured"
          description={
            inspection.reason ||
            'Configure Supabase credentials in .env.local to inspect and accept live partner invitations.'
          }
        />
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
          {inspection?.expiresAt && inspection.valid && (
            <p className="text-[11px] flex items-center gap-1 text-[var(--muted-foreground)] pt-1">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Expires {new Date(inspection.expiresAt).toLocaleString()}</span>
            </p>
          )}
        </div>

        <Button
          onClick={handleAcceptInvite}
          variant="primary"
          className="w-full"
          size="lg"
          isLoading={loading || inspecting}
          disabled={
            inspecting ||
            Boolean(error) ||
            Boolean(invalidReason) ||
            Boolean(inspection && !inspection.configured)
          }
        >
          <span>Accept Invitation &amp; Enter</span>
          <ArrowRight className="h-4 w-4 ml-1.5" />
        </Button>

        <div className="text-center text-xs text-[var(--muted-foreground)] space-x-2">
          <span>Need an account or session?</span>
          <Link
            href={`/sanctuary/login?next=${encodeURIComponent(`/invite/${token}`)}`}
            className="text-[var(--primary)] font-medium hover:underline"
          >
            Sign in
          </Link>
          <span>·</span>
          <Link
            href={`/sanctuary/register?next=${encodeURIComponent(`/invite/${token}`)}`}
            className="text-[var(--primary)] font-medium hover:underline"
          >
            Register
          </Link>
        </div>
      </div>
    </div>
  )
}
