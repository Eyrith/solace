'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  Sun,
  Moon,
  Monitor,
  Check,
  ArrowLeft,
  RotateCcw,
} from 'lucide-react'
import { useDesignSystem } from '@/components/providers/design-system-provider'
import {
  PALETTES,
  FONT_PAIRINGS,
  FONT_SCALE_VALUES,
  DENSITY_VALUES,
  CHAT_BACKGROUNDS,
  type FontScaleId,
  type DensityId,
} from '@/lib/design-system/tokens'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { ChatBubble } from '@/components/sanctuary/chat-bubble'
import { SettingsTabs } from '@/components/sanctuary/settings-tabs'

export default function AppearanceSettingsPage() {
  const {
    palette,
    setPalette,
    mode,
    setMode,
    fontPairing,
    setFontPairing,
    fontScale,
    setFontScale,
    density,
    setDensity,
    bubbleStyle,
    setBubbleStyle,
    chatBackground,
    setChatBackground,
    reducedMotion,
    setReducedMotion,
    resetDefaults,
  } = useDesignSystem()

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-10">
      {/* Header */}
      <div className="border-b border-[var(--border)] pb-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/home"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Sanctuary</span>
          </Link>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => resetDefaults('private')}
            className="text-xs text-[var(--muted-foreground)]"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            <span>Reset to Defaults</span>
          </Button>
        </div>

        <div className="space-y-1.5">
          <h1 className="font-[family-name:var(--ds-font-display)] text-3xl font-bold tracking-tight text-[var(--foreground)]">
            Appearance &amp; Atmosphere
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Tailor the visual tone, typography scale, density, and chat ergonomics. Changes apply live and save automatically.
          </p>
        </div>

        <SettingsTabs />
      </div>

      {/* ── 1. Color Palette Selection ───────────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--foreground)]">Atmosphere Palette</h2>
          <p className="text-xs text-[var(--muted-foreground)]">
            Select a harmonic palette. All colors meet strict WCAG AA contrast standards.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {PALETTES.map((p) => {
            const isSelected = palette === p.id
            return (
              <button
                key={p.id}
                onClick={() => setPalette(p.id)}
                className={`p-3.5 rounded-[var(--ds-radius)] border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[var(--primary)] bg-[var(--primary)]/10 ring-2 ring-[var(--primary)]'
                    : 'border-[var(--border)] bg-[var(--card)] hover:border-[var(--muted-foreground)]/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className="h-5 w-5 rounded-full border border-black/10 shadow-xs"
                    style={{ backgroundColor: p.lightSwatch }}
                  />
                  {isSelected && <Check className="h-4 w-4 text-[var(--primary)]" />}
                </div>
                <div className="font-medium text-xs text-[var(--foreground)] capitalize">
                  {p.name}
                </div>
                <div className="text-[10px] text-[var(--muted-foreground)] truncate">
                  {p.description}
                </div>
                {p.environment === 'public' && (
                  <Badge variant="outline" className="mt-1.5 text-[9px] font-normal px-1.5 py-0">
                    Editorial
                  </Badge>
                )}
              </button>
            )
          })}
        </div>
      </section>

      {/* ── 2. Mode (System / Light / Dark) ──────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--foreground)]">Color Mode</h2>
          <p className="text-xs text-[var(--muted-foreground)]">
            System follows your device appearance automatically, or choose an explicit tone.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 max-w-md">
          <button
            type="button"
            onClick={() => setMode('system')}
            className={`p-3.5 rounded-[var(--ds-radius)] border flex flex-col items-center justify-center gap-1.5 text-xs font-medium cursor-pointer transition-all ${
              mode === 'system'
                ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--foreground)] ring-1 ring-[var(--primary)]'
                : 'border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            <Monitor className="h-4 w-4" />
            <span>System</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('light')}
            className={`p-3.5 rounded-[var(--ds-radius)] border flex flex-col items-center justify-center gap-1.5 text-xs font-medium cursor-pointer transition-all ${
              mode === 'light'
                ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--foreground)] ring-1 ring-[var(--primary)]'
                : 'border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            <Sun className="h-4 w-4" />
            <span>Light</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('dark')}
            className={`p-3.5 rounded-[var(--ds-radius)] border flex flex-col items-center justify-center gap-1.5 text-xs font-medium cursor-pointer transition-all ${
              mode === 'dark'
                ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--foreground)] ring-1 ring-[var(--primary)]'
                : 'border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            <Moon className="h-4 w-4" />
            <span>Dark</span>
          </button>
        </div>
      </section>

      {/* ── 3. Typography Pairings ───────────────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--foreground)]">Editorial Typography</h2>
          <p className="text-xs text-[var(--muted-foreground)]">
            Pairings designed for literary beauty and long-form conversational ease.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {FONT_PAIRINGS.map((pair) => {
            const isSelected = fontPairing === pair.id
            return (
              <button
                key={pair.id}
                onClick={() => setFontPairing(pair.id)}
                className={`p-4 rounded-[var(--ds-radius)] border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[var(--primary)] bg-[var(--primary)]/10 ring-1 ring-[var(--primary)]'
                    : 'border-[var(--border)] bg-[var(--card)] hover:border-[var(--muted-foreground)]/50'
                }`}
              >
                <div className="font-semibold text-sm text-[var(--foreground)]">
                  {pair.name}
                </div>
                <div className="text-xs text-[var(--muted-foreground)] mt-1">
                  {pair.headingFamily} + {pair.bodyFamily}
                </div>
                <div className="text-[11px] text-[var(--muted-foreground)] mt-2 italic font-[family-name:var(--ds-font-display)]">
                  &ldquo;A quiet sanctuary for two.&rdquo;
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* ── 4. Chat Bubble Style & Live Preview ──────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--foreground)]">Chat Bubble Silhouette</h2>
          <p className="text-xs text-[var(--muted-foreground)]">
            How your messages look in conversation.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(['soft', 'editorial', 'pill', 'minimal'] as const).map((style) => (
            <button
              key={style}
              onClick={() => setBubbleStyle(style)}
              className={`px-3.5 py-1.5 rounded-[var(--ds-radius)] text-xs font-medium capitalize cursor-pointer border ${
                bubbleStyle === style
                  ? 'border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]'
                  : 'border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)]'
              }`}
            >
              {style}
            </button>
          ))}
        </div>

        {/* Live Preview Box */}
        <div
          className={`p-5 rounded-[var(--ds-radius)] border border-[var(--border)] space-y-3 chat-bg-${chatBackground}`}
        >
          <div className="text-xs font-mono uppercase tracking-wider text-[var(--muted-foreground)]">
            Live Preview · {bubbleStyle} style · {chatBackground} canvas
          </div>
          <ChatBubble
            id="prev-1"
            direction="received"
            text="I made us some chamomile tea with lavender honey."
            timestamp="10:20 PM"
            bubbleStyle={bubbleStyle}
          />
          <ChatBubble
            id="prev-2"
            direction="sent"
            text="Coming right now. Leaving the world behind."
            timestamp="10:21 PM"
            bubbleStyle={bubbleStyle}
            readReceipt="read"
          />
        </div>
      </section>

      {/* ── 5. Chat Background & Ergonomics ───────────────────────────────────── */}
      <section className="space-y-6">
        <div className="space-y-3">
          <div>
            <h2 className="text-base font-semibold text-[var(--foreground)]">Chat Surface Texture</h2>
            <p className="text-xs text-[var(--muted-foreground)]">
              Background grain for the private messaging stream.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {CHAT_BACKGROUNDS.map((bg) => (
              <button
                key={bg.id}
                type="button"
                onClick={() => setChatBackground(bg.id)}
                className={`px-3.5 py-1.5 rounded-[var(--ds-radius)] text-xs font-medium cursor-pointer border ${
                  chatBackground === bg.id
                    ? 'border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]'
                    : 'border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)]'
                }`}
              >
                {bg.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div>
              <h2 className="text-base font-semibold text-[var(--foreground)]">Reading Scale</h2>
              <p className="text-xs text-[var(--muted-foreground)]">
                Base typographic sizing across messages and journals.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(FONT_SCALE_VALUES) as [FontScaleId, { label: string }][]).map(
                ([id, meta]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setFontScale(id)}
                    className={`px-3 py-1.5 rounded-[var(--ds-radius)] text-xs font-medium cursor-pointer border ${
                      fontScale === id
                        ? 'border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]'
                        : 'border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)]'
                    }`}
                  >
                    {meta.label}
                  </button>
                ),
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <h2 className="text-base font-semibold text-[var(--foreground)]">Layout Density</h2>
              <p className="text-xs text-[var(--muted-foreground)]">
                Breathing room between cards and conversation turns.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(DENSITY_VALUES) as [DensityId, { label: string }][]).map(
                ([id, meta]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setDensity(id)}
                    className={`px-3 py-1.5 rounded-[var(--ds-radius)] text-xs font-medium cursor-pointer border ${
                      density === id
                        ? 'border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]'
                        : 'border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)]'
                    }`}
                  >
                    {meta.label}
                  </button>
                ),
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. Motion & Accessibility ───────────────────────────────────────── */}
      <section className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] p-5 flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-[var(--foreground)]">
            Reduced Motion
          </div>
          <div className="text-xs text-[var(--muted-foreground)]">
            Eliminate bouncing animations and fluid transitions for calmer visual pacing.
          </div>
        </div>

        <Switch
          checked={reducedMotion}
          onCheckedChange={setReducedMotion}
          aria-label="Toggle reduced motion"
        />
      </section>
    </div>
  )
}
