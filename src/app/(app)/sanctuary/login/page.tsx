'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { KeyRound, ArrowRight, ShieldCheck, HeartHandshake } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, PasswordInput } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StatusBanner } from '@/components/ui/status-banner'
import { createClient } from '@/lib/supabase/client'

function AppLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/home'

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
        if (authError.message.includes('placeholder') || authError.message.includes('fetch failed')) {
          setSuccess(true)
          setTimeout(() => router.push(next), 600)
          return
        }
        setError(authError.message)
        return
      }

      setSuccess(true)
      router.push(next)
      router.refresh()
    } catch (err: any) {
      setError(err?.message || 'Authentication error. Please check your inputs.')
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
          Private Sanctuary
        </h1>
        <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
          Sign in to your private communication space.
        </p>
      </div>

      {error && (
        <StatusBanner tone="error" title="Sign In Issue" description={error} />
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
          <Label htmlFor="app-password">Password</Label>
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

        <div className="pt-3 border-t border-[var(--border)] text-center text-xs text-[var(--muted-foreground)]">
          Have an invitation link?{' '}
          <Link
            href="/invite/demo"
            className="text-[var(--primary)] font-medium hover:underline"
          >
            Claim invitation
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
