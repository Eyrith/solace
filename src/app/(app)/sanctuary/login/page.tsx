'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, HeartHandshake } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, PasswordInput } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StatusBanner } from '@/components/ui/status-banner'
import { createClient, isSupabaseClientConfigured } from '@/lib/supabase/client'
import { updateLocalProfile } from '@/lib/sanctuary/local-store'
import { safeRedirectPath } from '@/lib/utils'

function AppLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = safeRedirectPath(searchParams.get('next'), '/home')

  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [resetLoading, setResetLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [notice, setNotice] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setNotice(null)

    if (!isSupabaseClientConfigured()) {
      setLoading(false)
      setError(
        'Supabase authentication is not configured yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.',
      )
      return
    }

    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError(authError.message)
        return
      }

      setSuccess(true)
      router.push(next)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication error. Please check your inputs.')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    setError(null)
    setNotice(null)
    if (!email.trim()) {
      setError('Enter your account email first to send a password reset link.')
      return
    }
    if (!isSupabaseClientConfigured()) {
      setError(
        'Password reset requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.',
      )
      return
    }

    setResetLoading(true)
    try {
      const supabase = createClient()
      const redirectTo = `${window.location.origin}/sanctuary/login`
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      })
      if (resetError) {
        setError(resetError.message)
        return
      }
      setNotice('If an account exists for that email, a password reset link has been sent.')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not send reset email.')
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16 sm:py-24 space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--muted)] text-[var(--primary)] mb-1">
          <HeartHandshake className="h-5 w-5" />
        </div>
        <h1 className="font-[family-name:var(--ds-font-display)] text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          Private Sanctuary
        </h1>
        <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
          Sign in to your private communication space.
        </p>
      </div>

      {error && (
        <StatusBanner tone="error" title="Sign In Issue" description={error} />
      )}

      {notice && (
        <StatusBanner tone="info" title="Password Reset" description={notice} />
      )}

      {success && (
        <StatusBanner
          tone="success"
          title="Access Granted"
          description="Opening your sanctuary space..."
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-4 rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] p-6 shadow-xs">
        <div className="space-y-1.5">
          <Label htmlFor="app-email">Account Email</Label>
          <Input
            id="app-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@domain.com"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="app-password">Password</Label>
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={resetLoading}
              className="text-[11px] text-[var(--muted-foreground)] hover:text-[var(--primary)] cursor-pointer disabled:opacity-50"
            >
              {resetLoading ? 'Sending...' : 'Forgot password?'}
            </button>
          </div>
          <PasswordInput
            id="app-password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
          />
        </div>

        <Button type="submit" variant="primary" className="w-full mt-2" isLoading={loading}>
          <span>Enter Sanctuary</span>
          <ArrowRight className="h-4 w-4 ml-1.5" />
        </Button>

        {!isSupabaseClientConfigured() && (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => {
              if (typeof document !== 'undefined') {
                document.cookie = 'sanctuary_sandbox=true; path=/; max-age=86400; SameSite=Lax'
              }
              if (email.trim()) {
                updateLocalProfile({ email: email.trim() })
              }
              router.push(next)
            }}
          >
            Enter Local Sanctuary Sandbox
          </Button>
        )}

        <div className="pt-3 border-t border-[var(--border)] text-center text-xs text-[var(--muted-foreground)]">
          Need a private account?{' '}
          <Link
            href={`/sanctuary/register${next !== '/home' ? `?next=${encodeURIComponent(next)}` : ''}`}
            className="text-[var(--primary)] font-medium hover:underline"
          >
            Create sanctuary account
          </Link>
        </div>
      </form>

      <div className="text-center text-xs text-[var(--muted-foreground)]">
        <Link href="/" className="hover:underline">
          &larr; Return to Editorial Portal
        </Link>
      </div>
    </div>
  )
}

export default function AppLoginPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Loading...</div>}>
      <AppLoginForm />
    </React.Suspense>
  )
}
