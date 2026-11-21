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

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = safeRedirectPath(searchParams.get('next'), '/')

  const [displayName, setDisplayName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [confirmationMessage, setConfirmationMessage] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setConfirmationMessage(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

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
          data: {
            display_name: displayName,
          },
        },
      })

      if (authError) {
        setError(authError.message)
        return
      }

      if (!data.session && data.user) {
        setConfirmationMessage(
          `Check ${email} to verify your address before signing in.`,
        )
        return
      }

      setSuccess(true)
      router.push(next)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to create account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:py-24 space-y-8">
      {/* Editorial Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--muted)] text-[var(--primary)] mb-2">
          <BookOpen className="h-5 w-5" />
        </div>
        <h1 className="font-[family-name:var(--ds-font-display)] text-3xl font-bold tracking-tight text-[var(--foreground)]">
          Create Reader Account
        </h1>
        <p className="text-xs sm:text-sm text-[var(--muted-foreground)] leading-relaxed">
          Maintain your personal commonplace book, reading streaks, and saved passages in one calm place.
        </p>
      </div>

      {error && (
        <StatusBanner tone="error" title="Registration Issue" description={error} />
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
          title="Account Initialized"
          description="Welcome to Commonplace. Initializing your personal reading library..."
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-4 rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] p-6 shadow-xs">
        <div className="space-y-2">
          <Label htmlFor="reg-name">Reader Name or Pseudonym</Label>
          <Input
            id="reg-name"
            type="text"
            required
            placeholder="e.g. S. Miller"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reg-email">Email Address</Label>
          <Input
            id="reg-email"
            type="email"
            autoComplete="email"
            required
            placeholder="reader@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reg-password">Password</Label>
          <PasswordInput
            id="reg-password"
            autoComplete="new-password"
            required
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reg-confirm">Confirm Password</Label>
          <PasswordInput
            id="reg-confirm"
            autoComplete="new-password"
            required
            placeholder="Repeat password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        <Button type="submit" variant="primary" className="w-full mt-2" isLoading={loading}>
          <span>Create Reader Account</span>
          <ArrowRight className="h-4 w-4 ml-1.5" />
        </Button>

        {!isSupabaseClientConfigured() && (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => {
              if (typeof window !== 'undefined' && (displayName.trim() || email.trim())) {
                window.localStorage.setItem(
                  'project00_editorial_reader_name',
                  displayName.trim() || email.trim(),
                )
              }
              router.push(next)
            }}
          >
            Continue in Local Browser Mode
          </Button>
        )}

        <div className="pt-4 border-t border-[var(--border)] text-center text-xs text-[var(--muted-foreground)]">
          Already have an account?{' '}
          <Link
            href={`/auth/login${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`}
            className="text-[var(--primary)] font-medium hover:underline"
          >
            Sign in here
          </Link>
        </div>
      </form>

      <div className="flex items-center justify-center gap-2 text-xs text-[var(--muted-foreground)]">
        <ShieldCheck className="h-4 w-4 text-[var(--primary)]" />
        <span>We never share reader data or reading habits with third parties.</span>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Loading...</div>}>
      <RegisterForm />
    </React.Suspense>
  )
}
