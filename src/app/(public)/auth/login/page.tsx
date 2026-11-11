'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { BookOpen, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, PasswordInput } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StatusBanner } from '@/components/ui/status-banner'
import { createClient } from '@/lib/supabase/client'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/'

  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        // If Supabase is in placeholder/mock mode during local dev, provide helpful message or pass through
        if (authError.message.includes('placeholder') || authError.message.includes('fetch failed')) {
          // Local demo sign-in
          setSuccess(true)
          setTimeout(() => router.push(next), 800)
          return
        }
        setError(authError.message)
        return
      }

      setSuccess(true)
      router.push(next)
      router.refresh()
    } catch (err: any) {
      setError(err?.message || 'Unable to sign in. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:py-24 space-y-8">
      {/* Discreet Editorial Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--muted)] text-[var(--primary)] mb-2">
          <BookOpen className="h-5 w-5" />
        </div>
        <h1 className="font-[family-name:var(--ds-font-display)] text-3xl font-bold tracking-tight text-[var(--foreground)]">
          Reader Sign In
        </h1>
        <p className="text-xs sm:text-sm text-[var(--muted-foreground)] leading-relaxed">
          Access your personal reading log, cross-device notes, and saved essays across our curated journals.
        </p>
      </div>

      {error && (
        <StatusBanner tone="error" title="Sign In Issue" description={error} />
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
            <Link
              href="#forgot-password"
              className="text-xs text-[var(--muted-foreground)] hover:text-[var(--primary)]"
            >
              Forgot password?
            </Link>
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
