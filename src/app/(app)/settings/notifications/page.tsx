'use client'

import * as React from 'react'
import Link from 'next/link'
import { Bell, ShieldCheck, ArrowLeft, EyeOff, Volume2 } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { useDesignSystem } from '@/components/providers/design-system-provider'

export default function NotificationSettingsPage() {
  const { discreetNotifications, setDiscreetNotifications } = useDesignSystem()
  const [soundEnabled, setSoundEnabled] = React.useState(true)
  const [callAlerts, setCallAlerts] = React.useState(true)

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
          Notifications &amp; Discretion
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Privacy and alert controls configured for maximum confidentiality.
        </p>
      </div>

      <div className="space-y-4">
        {/* Discreet Notifications */}
        <div className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] p-5 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <EyeOff className="h-4 w-4 text-[var(--primary)]" />
              <div className="text-sm font-semibold text-[var(--foreground)]">
                Discreet Push Alerts
              </div>
            </div>
            <p className="text-xs text-[var(--muted-foreground)] max-w-md leading-relaxed">
              When enabled, incoming alerts never show sender names, relationship status, or message previews. Notifications will only appear as a neutral educational notification (e.g. &ldquo;Commonplace · New reading item available&rdquo;).
            </p>
          </div>

          <Switch
            checked={discreetNotifications}
            onCheckedChange={setDiscreetNotifications}
            aria-label="Toggle discreet notifications"
          />
        </div>

        {/* Gentle Chimes */}
        <div className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] p-5 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-[var(--primary)]" />
              <div className="text-sm font-semibold text-[var(--foreground)]">
                Soft Acoustic Chimes
              </div>
            </div>
            <p className="text-xs text-[var(--muted-foreground)] max-w-md leading-relaxed">
              Play calming, non-jarring acoustic sounds for incoming messages when the app is active.
            </p>
          </div>

          <Switch
            checked={soundEnabled}
            onCheckedChange={setSoundEnabled}
            aria-label="Toggle sound alerts"
          />
        </div>

        {/* Incoming Call Ringing */}
        <div className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] p-5 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-[var(--primary)]" />
              <div className="text-sm font-semibold text-[var(--foreground)]">
                Incoming Video &amp; Voice Ringing
              </div>
            </div>
            <p className="text-xs text-[var(--muted-foreground)] max-w-md leading-relaxed">
              Ring device when partner initiates a 1:1 call from their space.
            </p>
          </div>

          <Switch
            checked={callAlerts}
            onCheckedChange={setCallAlerts}
            aria-label="Toggle call alerts"
          />
        </div>
      </div>
    </div>
  )
}
