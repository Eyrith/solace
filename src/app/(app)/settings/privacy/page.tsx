'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  Eye,
  EyeOff,
  Flame,
  Shield,
  Trash2,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { SectionRule } from '@/components/ui/section-rule'
import { SettingsTabs } from '@/components/sanctuary/settings-tabs'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { wipeSanctuarySession } from '@/lib/sanctuary/stealth'

export default function PrivacySettingsPage() {
  const router = useRouter()
  const [decoyMode, setDecoyMode] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem('sanctuary:camouflage-mode') === 'true'
    }
    return false
  })
  const [confirmWipeOpen, setConfirmWipeOpen] = React.useState(false)
  const [wiped, setWiped] = React.useState(false)

  const handleToggleDecoy = (checked: boolean) => {
    setDecoyMode(checked)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('sanctuary:camouflage-mode', String(checked))
    }
  }

  const handleWipeSession = () => {
    wipeSanctuarySession()
    setWiped(true)
    setConfirmWipeOpen(false)
    setTimeout(() => {
      router.push('/')
    }, 800)
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-8">
      <PageHeader
        title="Privacy & Discretion"
        description="Manage device camouflage, quick cover shortcuts, and secure local session storage."
        backHref="/home"
        backLabel="Back to Sanctuary"
      >
        <SettingsTabs />
      </PageHeader>

      {/* ── 1. Device Cover ──────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--foreground)]">
            Device Cover
          </h2>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
            Instantly switch the screen to Meridian public reading magazine if someone walks by.
          </p>
        </div>

        <div className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--surface-1)] p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-[var(--primary)]" aria-hidden="true" />
                <span className="text-sm font-medium text-[var(--foreground)]">
                  Quick Cover Shortcut
                </span>
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">
                Pressing <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-[var(--surface-2)] border border-[var(--border)]">Alt + C</kbd> or clicking Cover in the sidebar immediately displays the Meridian arts &amp; philosophy digest.
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => router.push('/')}
              className="shrink-0"
            >
              Test Cover Now
            </Button>
          </div>

          <SectionRule />

          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {decoyMode ? (
                  <EyeOff className="h-4 w-4 text-[var(--primary)]" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4 text-[var(--muted-foreground)]" aria-hidden="true" />
                )}
                <span className="text-sm font-medium text-[var(--foreground)]">
                  Decoy Camouflage Aliases
                </span>
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">
                When active, rooms display disguised study titles (e.g. &ldquo;Stoic Notes&rdquo;, &ldquo;Reading Journal&rdquo;) rather than personal partner names.
              </p>
            </div>

            <Switch
              checked={decoyMode}
              onCheckedChange={handleToggleDecoy}
              aria-label="Toggle decoy camouflage mode"
            />
          </div>
        </div>
      </section>

      {/* ── 2. Data Protection & Wipe ────────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--foreground)]">
            Local Device Footprint
          </h2>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
            Sanctuary credentials and cached messages can be purged immediately while safely preserving your reading history and appearance.
          </p>
        </div>

        <div className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--surface-1)] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[var(--destructive)]">
              <Flame className="h-4 w-4" aria-hidden="true" />
              <span className="text-sm font-medium text-[var(--foreground)]">
                Clear Sanctuary Session
              </span>
            </div>
            <p className="text-xs text-[var(--muted-foreground)]">
              Purges local encryption keys and private conversation history on this device and returns to the cover.
            </p>
          </div>

          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => setConfirmWipeOpen(true)}
            className="shrink-0"
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            <span>Purge Session</span>
          </Button>
        </div>
      </section>

      {/* Confirmation Dialog */}
      <Dialog open={confirmWipeOpen} onOpenChange={setConfirmWipeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Purge Local Sanctuary Session?</DialogTitle>
            <DialogDescription className="mt-2">
              This will remove all private chat keys and room connections cached on this browser. Your saved articles, bookmarks, and appearance settings will remain intact.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmWipeOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleWipeSession}
            >
              {wiped ? 'Purged · Redirecting...' : 'Confirm Purge'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
