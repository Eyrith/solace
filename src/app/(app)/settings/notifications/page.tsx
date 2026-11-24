'use client'

import * as React from 'react'
import Link from 'next/link'
import { Bell, ArrowLeft, EyeOff, Volume2, Sparkles, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { useDesignSystem } from '@/components/providers/design-system-provider'
import { SettingsTabs } from '@/components/sanctuary/settings-tabs'

function playSoftChime() {
  if (typeof window === 'undefined') return
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioCtx) return
  try {
    const ctx = new AudioCtx()
    const now = ctx.currentTime
    const notes = [523.25, 659.25] // C5 -> E5 soft acoustic interval
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now + idx * 0.14)
      gain.gain.setValueAtTime(0.0001, now + idx * 0.14)
      gain.gain.exponentialRampToValueAtTime(0.08, now + idx * 0.14 + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.14 + 0.45)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + idx * 0.14)
      osc.stop(now + idx * 0.14 + 0.5)
    })
    window.setTimeout(() => void ctx.close().catch(() => {}), 900)
  } catch {}
}

export default function NotificationSettingsPage() {
  const {
    discreetNotifications,
    setDiscreetNotifications,
    soundEnabled,
    setSoundEnabled,
    callAlerts,
    setCallAlerts,
  } = useDesignSystem()

  const [previewVisible, setPreviewVisible] = React.useState(false)
  const [chimeNotice, setChimeNotice] = React.useState<string | null>(null)

  const handleTestChime = () => {
    if (!soundEnabled) {
      setChimeNotice('Acoustic chimes are currently muted. Enable Soft Acoustic Chimes above to test sound.')
      return
    }
    playSoftChime()
    setChimeNotice('Played soft two-note acoustic chime.')
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-8">
      <div className="border-b border-[var(--border)] pb-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link
            href="/home"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Sanctuary</span>
          </Link>
          <Badge variant="outline" className="text-[11px] font-normal gap-1">
            <Check className="h-3 w-3 text-emerald-500" />
            <span>Saved automatically</span>
          </Badge>
        </div>

        <div className="space-y-1.5">
          <h1 className="font-[family-name:var(--ds-font-display)] text-3xl font-bold tracking-tight text-[var(--foreground)]">
            Notifications &amp; Discretion
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Privacy and alert controls configured for maximum confidentiality and calm pacing.
          </p>
        </div>

        <SettingsTabs />
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
              When enabled, incoming alerts never show sender names, relationship status, or message previews. Notifications will only appear as a neutral educational notification (e.g. &ldquo;Meridian · New reading item available&rdquo;).
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

        {/* Interactive Preview & Audio Test */}
        <div className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--muted)]/40 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[var(--primary)]" />
                <span>Test Alert Presentation</span>
              </h2>
              <p className="text-xs text-[var(--muted-foreground)]">
                Verify how incoming alerts look and sound with your current settings.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPreviewVisible((v) => !v)}
              >
                {previewVisible ? 'Hide Alert Preview' : 'Preview Notification'}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleTestChime}>
                Test Acoustic Chime
              </Button>
            </div>
          </div>

          {chimeNotice && (
            <p className="text-xs text-[var(--muted-foreground)]">{chimeNotice}</p>
          )}

          {previewVisible && (
            <div className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] p-4 flex items-start justify-between gap-3 shadow-xs">
              <div className="space-y-1">
                <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--muted-foreground)]">
                  {discreetNotifications ? 'Discreet Mask Active' : 'Direct Preview'}
                </div>
                <div className="text-sm font-semibold text-[var(--foreground)]">
                  {discreetNotifications
                    ? 'Meridian · New reading item available'
                    : 'Sanctuary · New note waiting from Partner'}
                </div>
                <div className="text-xs text-[var(--muted-foreground)]">
                  {discreetNotifications
                    ? 'Sender name and message text are hidden on lock screens.'
                    : 'Sender attribution is visible in alert banners.'}
                </div>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {callAlerts ? 'Calls Active' : 'Calls Silenced'}
              </Badge>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

