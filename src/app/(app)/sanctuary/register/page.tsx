'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { HeartHandshake, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, PasswordInput } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StatusBanner } from '@/components/ui/status-banner'
import { createClient, isSupabaseClientConfigured } from '@/lib/supabase/client'
import { updateLocalProfile } from '@/lib/sanctuary/local-store'
import { safeRedirectPath } from '@/lib/utils'

function AppRegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = safeRedirectPath(searchParams.get('next'), '/home')

  const [displayName, setDisplayName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [confirmationMessage, setConfirmationMessage] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setConfirmationMessage(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }

    if (!isSupabaseClientConfigured()) {
      setError(
        'Registration requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.',
      )
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
        },
      })

      if (authError) {
        setError(authError.message)
        return
      }

      if (!data.session && data.user) {
        setConfirmationMessage(
          `Check ${email} to verify your email address, then sign in to continue.`,
        )
        return
      }

      setSuccess(true)
      router.push(next)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to register.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16 sm:py-24 space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--muted)] text-[var(--primary)] mb-1">
          <HeartHandshake className="h-5 w-5" />
        </div>
        <h1 className="font-[family-name:var(--ds-font-display)] text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          Join Sanctuary
        </h1>
        <p className="text-xs text-[var(--muted-foreground)]">
          Create your private profile to connect with your partner.
        </p>
      </div>

      {error && (
        <StatusBanner tone="error" title="Registration Failed" description={error} />
      )}

      {confirmationMessage && (
        <StatusBanner
          tone="info"
          title="Confirm Your Email"
          description={confirmationMessage}
        />
      )}

      {success && (
        <StatusBanner
          tone="success"
          title="Profile Created"
          description="Entering your private space..."
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-4 rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] p-6 shadow-xs">
        <div className="space-y-1.5">
          <Label htmlFor="app-reg-name">Your Nickname / Name</Label>
          <Input
            id="app-reg-name"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. Deb or My Love"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="app-reg-email">Account Email</Label>
          <Input
            id="app-reg-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@domain.com"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="app-reg-password">Password</Label>
          <PasswordInput
            id="app-reg-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
          />
        </div>

        <Button type="submit" variant="primary" className="w-full mt-2" isLoading={loading}>
          <span>Create Account</span>
          <ArrowRight className="h-4 w-4 ml-1.5" />
        </Button>

        {!isSupabaseClientConfigured() && (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => {
              updateLocalProfile({
                ...(displayName.trim() ? { selfDisplayName: displayName.trim() } : {}),
                ...(email.trim() ? { email: email.trim() } : {}),
              })
              router.push(next)
            }}
          >
            Create Local Sandbox Profile &amp; Enter
          </Button>
        )}

        <div className="pt-3 border-t border-[var(--border)] text-center text-xs text-[var(--muted-foreground)]">
          Already have an account?{' '}
          <Link
            href={`/sanctuary/login${next !== '/home' ? `?next=${encodeURIComponent(next)}` : ''}`}
            className="text-[var(--primary)] font-medium hover:underline"
          >
            Sign in
          </Link>
        </div>
      </form>
    </div>
  )
}

export default function AppRegisterPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Loading...</div>}>
      <AppRegisterForm />
    </React.Suspense>
  )
}
