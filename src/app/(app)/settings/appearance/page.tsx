'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  Palette,
  Sun,
  Moon,
  Type,
  Maximize2,
  Check,
  Sparkles,
  ArrowLeft,
  Volume2,
  Eye,
} from 'lucide-react'
import { useDesignSystem } from '@/components/providers/design-system-provider'
import { PALETTES, FONT_PAIRINGS } from '@/lib/design-system/tokens'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { ChatBubble } from '@/components/sanctuary/chat-bubble'

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
  } = useDesignSystem()

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-10">
      {/* Header */}
      <div className="border-b border-[var(--border)] pb-6 space-y-2">
        <Link
          href="/home"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Sanctuary</span>
        </Link>
        <h1 className="font-[family-name:var(--ds-font-display)] text-3xl font-bold tracking-tight text-[var(--foreground)]">
          Appearance &amp; Atmosphere
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Tailor the visual tone, typography, and chat ergonomics to match your sanctuary mood.
        </p>
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
                onClick={() => setPalette(p.id as any)}
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
              </button>
            )
          })}
        </div>
      </section>

      {/* ── 2. Mode (Light / Dark) ───────────────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--foreground)]">Color Mode</h2>
          <p className="text-xs text-[var(--muted-foreground)]">
            Gentle day appearance or calming midnight ambiance.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 max-w-sm">
          <button
            onClick={() => setMode('light')}
            className={`p-4 rounded-[var(--ds-radius)] border flex items-center justify-center gap-2 text-xs font-medium cursor-pointer ${
              mode === 'light'
                ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--foreground)] ring-1 ring-[var(--primary)]'
                : 'border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)]'
            }`}
          >
            <Sun className="h-4 w-4" />
            <span>Light Ambiance</span>
          </button>

          <button
            onClick={() => setMode('dark')}
            className={`p-4 rounded-[var(--ds-radius)] border flex items-center justify-center gap-2 text-xs font-medium cursor-pointer ${
              mode === 'dark'
                ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--foreground)] ring-1 ring-[var(--primary)]'
                : 'border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)]'
            }`}
          >
            <Moon className="h-4 w-4" />
            <span>Dark Night</span>
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
                onClick={() => setFontPairing(pair.id as any)}
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
        <div className="p-5 rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] space-y-3">
          <div className="text-xs font-mono uppercase tracking-wider text-[var(--muted-foreground)]">
            Live Preview · {bubbleStyle} style
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

      {/* ── 5. Motion & Accessibility ───────────────────────────────────────── */}
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
