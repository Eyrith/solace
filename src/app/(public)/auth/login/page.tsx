'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { BookOpen, ArrowRight, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, PasswordInput } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StatusBanner } from '@/components/ui/status-banner'
import { createClient, isSupabaseClientConfigured } from '@/lib/supabase/client'
import { safeRedirectPath } from '@/lib/utils'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = safeRedirectPath(searchParams.get('next'), '/')

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
      setError(err instanceof Error ? err.message : 'Unable to sign in. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    setError(null)
    setNotice(null)
    if (!email.trim()) {
      setError('Enter your email address first so we know where to send your reset link.')
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
      const redirectTo = `${window.location.origin}/auth/login`
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
    <div className="mx-auto max-w-md px-4 py-16 sm:py-24 space-y-8">
      {/* Discreet Editorial Header */}
      <div className="text-center space-y-2">
        <h1 className="font-[family-name:var(--ds-font-display)] text-3xl font-bold text-[var(--foreground)]">
          Reader Sign In
        </h1>
        <p className="text-xs sm:text-sm text-[var(--muted-foreground)] leading-relaxed">
          Access your personal reading log, cross-device notes, and saved essays across our curated journals.
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
          title="Welcome Back"
          description="Authentication confirmed. Redirecting to your reading library..."
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-4 rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] p-6 shadow-xs">
        <div className="space-y-2">
          <Label htmlFor="login-email">Email Address</Label>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            placeholder="reader@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="login-password">Password</Label>
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={resetLoading}
              className="text-xs text-[var(--muted-foreground)] hover:text-[var(--primary)] cursor-pointer disabled:opacity-50"
            >
              {resetLoading ? 'Sending link...' : 'Forgot password?'}
            </button>
          </div>
          <PasswordInput
            id="login-password"
            autoComplete="current-password"
            required
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <Button type="submit" variant="primary" className="w-full mt-2" isLoading={loading}>
          <span>Sign In to Reader Library</span>
          <ArrowRight className="h-4 w-4 ml-1.5" />
        </Button>

        {!isSupabaseClientConfigured() && (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => {
              if (typeof window !== 'undefined' && email.trim()) {
                window.localStorage.setItem('project00_editorial_reader_name', email.trim())
              }
              router.push(next)
            }}
          >
            Continue in Local Browser Mode
          </Button>
        )}

        <div className="pt-4 border-t border-[var(--border)] text-center text-xs text-[var(--muted-foreground)]">
          New to Commonplace?{' '}
          <Link
            href={`/auth/register${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`}
            className="text-[var(--primary)] font-medium hover:underline"
          >
            Create a reader account
          </Link>
        </div>
      </form>

      {/* Discreet Trust Notice */}
      <div className="flex items-center justify-center gap-2 text-xs text-[var(--muted-foreground)]">
        <ShieldCheck className="h-4 w-4 text-[var(--primary)]" />
        <span>End-to-end transport encryption with strict session isolation.</span>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Loading...</div>}>
      <LoginForm />
    </React.Suspense>
  )
}
