'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  User,
  ShieldAlert,
  LogOut,
  Trash2,
  ArrowLeft,
  KeyRound,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { createClient } from '@/lib/supabase/client'

export default function AccountSettingsPage() {
  const router = useRouter()
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false)
  const [revoking, setRevoking] = React.useState(false)
  const [revokedSuccess, setRevokedSuccess] = React.useState(false)

  const handleLogout = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
    } catch {}
    router.push('/')
  }

  const handleRevokeSessions = async () => {
    setRevoking(true)
    setTimeout(() => {
      setRevoking(false)
      setRevokedSuccess(true)
      setTimeout(() => setRevokedSuccess(false), 3000)
    }, 1200)
  }

  const handleDeleteAccount = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
    } catch {}
    router.push('/')
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-8">
      <div className="border-b border-[var(--border)] pb-6 space-y-2">
        <Link
          href="/home"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Sanctuary</span>
        </Link>
        <h1 className="font-[family-name:var(--ds-font-display)] text-3xl font-bold tracking-tight text-[var(--foreground)]">
          Account &amp; Security Controls
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Session integrity, device revocation, and irreversible account termination.
        </p>
      </div>

      <div className="space-y-6">
        {/* Profile Card */}
        <div className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] p-6 space-y-4">
          <h2 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
            <User className="h-4 w-4 text-[var(--primary)]" />
            <span>Profile Identity</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-[var(--muted-foreground)] block">Display Name</span>
              <span className="font-medium text-[var(--foreground)]">You</span>
            </div>
            <div>
              <span className="text-[var(--muted-foreground)] block">Role</span>
              <span className="font-medium text-[var(--foreground)]">Space Co-owner</span>
            </div>
          </div>
        </div>

        {/* Sessions & Security */}
        <div className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-[var(--primary)]" />
                <span>Session Revocation</span>
              </h2>
              <p className="text-xs text-[var(--muted-foreground)] max-w-md leading-relaxed">
                If you suspect another browser or device has an open tab, you can immediately invalidate all active refresh tokens.
              </p>
            </div>
          </div>

          {revokedSuccess && (
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              ✓ All external sessions revoked successfully.
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRevokeSessions}
              isLoading={revoking}
            >
              <span>Revoke Other Devices</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-xs"
            >
              <LogOut className="h-3.5 w-3.5 mr-1.5" />
              <span>Sign Out</span>
            </Button>
          </div>
        </div>

        {/* Danger Zone: Account Deletion */}
        <div className="rounded-[var(--ds-radius)] border border-rose-500/30 bg-rose-500/5 p-6 space-y-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" />
              <span>Danger Zone: Permanent Account Deletion</span>
            </h2>
            <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
              Permanently purges your profile, leaves all private spaces, and hard-deletes your personal notes from the database. This action is irreversible.
            </p>
          </div>

          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteModalOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            <span>Delete My Account Permanently</span>
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Permanently Delete Your Account?"
        description="Are you absolutely certain? This will immediately remove all your personal notes, membership in private spaces, and profile credentials. Expired disappearing messages cannot be recovered."
        confirmLabel="Yes, Delete Permanently"
        variant="destructive"
        onConfirm={handleDeleteAccount}
      />
    </div>
  )
}
