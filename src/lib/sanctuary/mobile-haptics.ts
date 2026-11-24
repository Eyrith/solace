'use client'

import * as React from 'react'

export type HapticType =
  | 'light'
  | 'medium'
  | 'heavy'
  | 'success'
  | 'warning'
  | 'clash'
  | 'lantern'

const HAPTIC_PATTERNS: Record<HapticType, number | number[]> = {
  light: 15,
  medium: 30,
  heavy: 55,
  success: [35, 50, 65],
  warning: [50, 40, 50],
  clash: [80, 50, 80],
  lantern: [20, 30, 50],
}

/**
 * Trigger tactile feedback across web, mobile browsers, and WebView.
 * Gracefully falls back when Vibration API is unavailable.
 */
export function triggerHaptic(type: HapticType = 'light'): void {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return

  try {
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      const pattern = HAPTIC_PATTERNS[type]
      navigator.vibrate(pattern)
    }
  } catch {
    // Vibration blocked by permissions or platform policy; fail silently
  }
}

/**
 * Play gentle synthesized audio cues for bedtime game interactions using Web Audio API.
 * Designed for late-night play: soft, warm frequencies with gentle sine and triangle waves.
 */
export function playBedtimeSound(
  sound: 'paddle' | 'lantern' | 'clash' | 'reveal' | 'success' | 'lock'
): void {
  if (typeof window === 'undefined') return

  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return

    const ctx = new AudioContextClass()
    const now = ctx.currentTime

    switch (sound) {
      case 'lantern': {
        // High ethereal pentatonic bell chime (G5 -> C6)
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(783.99, now) // G5
        osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.15) // C6
        gain.gain.setValueAtTime(0.12, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now)
        osc.stop(now + 0.42)
        break
      }
      case 'paddle': {
        // Soft water ripple (filtered white noise + low resonant blip)
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(140, now)
        osc.frequency.exponentialRampToValueAtTime(70, now + 0.18)
        gain.gain.setValueAtTime(0.08, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now)
        osc.stop(now + 0.25)
        break
      }
      case 'clash': {
        // Gentle hollow thud when hitting a soft river rock
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(110, now)
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.25)
        gain.gain.setValueAtTime(0.15, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now)
        osc.stop(now + 0.3)
        break
      }
      case 'lock': {
        // Subtle magnetic latch sound
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(440, now)
        osc.frequency.setValueAtTime(880, now + 0.05)
        gain.gain.setValueAtTime(0.08, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now)
        osc.stop(now + 0.16)
        break
      }
      case 'reveal':
      case 'success': {
        // Warm two-tone bedtime chord (E5 & B5)
        const frequencies = [659.25, 987.77]
        frequencies.forEach((f, idx) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = 'sine'
          osc.frequency.setValueAtTime(f, now + idx * 0.08)
          gain.gain.setValueAtTime(0.09, now + idx * 0.08)
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6)
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.start(now + idx * 0.08)
          osc.stop(now + 0.65)
        })
        break
      }
    }
  } catch {
    // Web Audio blocked or not permitted; fail silently
  }
}

/**
 * Screen Wake Lock hook: Prevents screen sleep / dimming during late-night calls and gameplay.
 * Automatically releases lock on unmount or when enabled is set to false.
 */
export function useScreenWakeLock(enabled: boolean = true) {
  const wakeLockRef = React.useRef<any>(null)

  React.useEffect(() => {
    if (!enabled || typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      return
    }

    let isSubscribed = true

    const requestLock = async () => {
      try {
        if (document.visibilityState === 'visible' && isSubscribed) {
          const nav = navigator as unknown as {
            wakeLock: {
              request: (type: 'screen') => Promise<any>
            }
          }
          wakeLockRef.current = await nav.wakeLock.request('screen')
        }
      } catch {
        // WakeLock request rejected or not supported on device
      }
    }

    void requestLock()

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && enabled) {
        void requestLock()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      isSubscribed = false
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (wakeLockRef.current) {
        try {
          wakeLockRef.current.release().catch(() => {})
        } catch {
          // ignore
        }
        wakeLockRef.current = null
      }
    }
  }, [enabled])
}
