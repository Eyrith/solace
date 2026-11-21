"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { MotionConfig } from "framer-motion";
import {
  type BubbleStyleId,
  type ChatBackgroundId,
  DENSITY_VALUES,
  type DensityId,
  type EnvironmentMode,
  FONT_PAIRINGS,
  FONT_SCALE_VALUES,
  type FontPairingId,
  type FontScaleId,
  PALETTES,
  type PaletteId,
  type ThemeMode,
} from "@/lib/design-system/tokens";
import { isSupabaseClientConfigured } from "@/lib/supabase/client";

export interface DesignSystemState {
  environment: EnvironmentMode;
  palette: PaletteId;
  mode: ThemeMode;
  fontPairing: FontPairingId;
  fontScale: FontScaleId;
  density: DensityId;
  bubbleStyle: BubbleStyleId;
  chatBackground: ChatBackgroundId;
  reducedMotion: boolean;
  discreetNotifications: boolean;
  soundEnabled: boolean;
  callAlerts: boolean;
}

interface DesignSystemContextValue extends DesignSystemState {
  setEnvironment: (environment: EnvironmentMode) => void;
  setPalette: (palette: PaletteId) => void;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  setFontPairing: (fontPairing: FontPairingId) => void;
  setFontScale: (fontScale: FontScaleId) => void;
  setDensity: (density: DensityId) => void;
  setBubbleStyle: (bubbleStyle: BubbleStyleId) => void;
  setChatBackground: (chatBackground: ChatBackgroundId) => void;
  setReducedMotion: (reducedMotion: boolean) => void;
  setDiscreetNotifications: (discreet: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setCallAlerts: (enabled: boolean) => void;
  resetDefaults: (environment?: EnvironmentMode) => void;
}

const DEFAULT_EDITORIAL_STATE: DesignSystemState = {
  environment: "editorial",
  palette: "editorial",
  mode: "light",
  fontPairing: "editorial-playfair",
  fontScale: "default",
  density: "comfortable",
  bubbleStyle: "soft",
  chatBackground: "solid",
  reducedMotion: false,
  discreetNotifications: true,
  soundEnabled: true,
  callAlerts: true,
};

const DEFAULT_PRIVATE_STATE: DesignSystemState = {
  environment: "private",
  palette: "ivory",
  mode: "light",
  fontPairing: "intimate-lora",
  fontScale: "default",
  density: "comfortable",
  bubbleStyle: "soft",
  chatBackground: "linen",
  reducedMotion: false,
  discreetNotifications: true,
  soundEnabled: true,
  callAlerts: true,
};

const VALID_PALETTES = new Set<string>(PALETTES.map((p) => p.id));
const VALID_PAIRINGS = new Set<string>(FONT_PAIRINGS.map((f) => f.id));
const VALID_SCALES = new Set<string>(["small", "default", "large", "xlarge"]);
const VALID_DENSITIES = new Set<string>(["compact", "comfortable", "spacious"]);
const VALID_BUBBLES = new Set<string>(["soft", "editorial", "pill", "minimal"]);
const VALID_BACKGROUNDS = new Set<string>(["solid", "linen", "botanical"]);
const STORAGE_KEY_PREFIX = "commonplace:ds:v1:";

const DesignSystemContext = createContext<DesignSystemContextValue | null>(null);

export interface DesignSystemProviderProps {
  children: React.ReactNode;
  initialEnvironment?: EnvironmentMode;
  initialPalette?: PaletteId;
}

/**
 * Provides design tokens, theme palettes, typography pairings, density,
 * and Framer Motion reduced-motion coordination across both environments.
 */
export function DesignSystemProvider({
  children,
  initialEnvironment = "editorial",
  initialPalette,
}: DesignSystemProviderProps) {
  const [state, setState] = useState<DesignSystemState>(() => {
    const base = initialEnvironment === "private" ? DEFAULT_PRIVATE_STATE : DEFAULT_EDITORIAL_STATE;
    return {
      ...base,
      ...(initialPalette ? { palette: initialPalette } : {}),
    };
  });
  const [userMutationSeq, setUserMutationSeq] = useState(0);
  const hydratedRef = useRef(false);

  // Hydrate locally saved tokens immediately, then overlay server preferences when signed in.
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    let active = true;

    Promise.resolve().then(() => {
      if (!active) return;
      try {
        const cached = window.localStorage.getItem(`${STORAGE_KEY_PREFIX}${initialEnvironment}`);
        if (cached) {
          const parsed = JSON.parse(cached) as Partial<DesignSystemState>;
          setState((prev) => ({
            ...prev,
            ...(parsed.palette && VALID_PALETTES.has(parsed.palette) ? { palette: parsed.palette } : {}),
            ...(parsed.mode === "light" || parsed.mode === "dark" ? { mode: parsed.mode } : {}),
            ...(parsed.fontPairing && VALID_PAIRINGS.has(parsed.fontPairing)
              ? { fontPairing: parsed.fontPairing }
              : {}),
            ...(parsed.fontScale && VALID_SCALES.has(parsed.fontScale)
              ? { fontScale: parsed.fontScale }
              : {}),
            ...(parsed.density && VALID_DENSITIES.has(parsed.density)
              ? { density: parsed.density }
              : {}),
            ...(parsed.bubbleStyle && VALID_BUBBLES.has(parsed.bubbleStyle)
              ? { bubbleStyle: parsed.bubbleStyle }
              : {}),
            ...(parsed.chatBackground && VALID_BACKGROUNDS.has(parsed.chatBackground)
              ? { chatBackground: parsed.chatBackground }
              : {}),
            ...(typeof parsed.reducedMotion === "boolean"
              ? { reducedMotion: parsed.reducedMotion }
              : {}),
            ...(typeof parsed.discreetNotifications === "boolean"
              ? { discreetNotifications: parsed.discreetNotifications }
              : {}),
            ...(typeof parsed.soundEnabled === "boolean"
              ? { soundEnabled: parsed.soundEnabled }
              : {}),
            ...(typeof parsed.callAlerts === "boolean" ? { callAlerts: parsed.callAlerts } : {}),
          }));
        }
      } catch {
        // Ignore storage failures
      }
    });

    if (!isSupabaseClientConfigured()) {
      return () => {
        active = false;
      };
    }

    fetch("/api/account/preferences", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (!active) return;
        const prefs = payload?.preferences as Record<string, unknown> | null | undefined;
        if (!prefs) return;
        const rawMode = prefs.color_mode;
        const resolvedMode: ThemeMode | undefined =
          rawMode === "light" || rawMode === "dark"
            ? rawMode
            : rawMode === "system" && typeof window !== "undefined"
              ? window.matchMedia("(prefers-color-scheme: dark)").matches
                ? "dark"
                : "light"
              : undefined;

        setState((prev) => ({
          ...prev,
          ...(typeof prefs.palette === "string" && VALID_PALETTES.has(prefs.palette)
            ? { palette: prefs.palette as PaletteId }
            : {}),
          ...(resolvedMode ? { mode: resolvedMode } : {}),
          ...(typeof prefs.font_pairing === "string" && VALID_PAIRINGS.has(prefs.font_pairing)
            ? { fontPairing: prefs.font_pairing as FontPairingId }
            : {}),
          ...(typeof prefs.font_scale === "string" && VALID_SCALES.has(prefs.font_scale)
            ? { fontScale: prefs.font_scale as FontScaleId }
            : {}),
          ...(typeof prefs.density === "string" && VALID_DENSITIES.has(prefs.density)
            ? { density: prefs.density as DensityId }
            : {}),
          ...(typeof prefs.bubble_style === "string" && VALID_BUBBLES.has(prefs.bubble_style)
            ? { bubbleStyle: prefs.bubble_style as BubbleStyleId }
            : {}),
          ...(typeof prefs.chat_background === "string" && VALID_BACKGROUNDS.has(prefs.chat_background)
            ? { chatBackground: prefs.chat_background as ChatBackgroundId }
            : {}),
          ...(typeof prefs.reduced_motion === "boolean"
            ? { reducedMotion: prefs.reduced_motion }
            : {}),
          ...(typeof prefs.discreet_notifs === "boolean"
            ? { discreetNotifications: prefs.discreet_notifs }
            : {}),
          ...(typeof prefs.sound_enabled === "boolean"
            ? { soundEnabled: prefs.sound_enabled }
            : {}),
          ...(typeof prefs.call_alerts === "boolean" ? { callAlerts: prefs.call_alerts } : {}),
        }));
      })
      .catch(() => {
        // Offline / anonymous visitors continue smoothly with local tokens
      });

    return () => {
      active = false;
    };
  }, [initialEnvironment]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", state.palette);
    root.setAttribute("data-mode", state.mode);
    root.setAttribute("data-environment", state.environment);
    root.setAttribute("data-reduced-motion", String(state.reducedMotion));

    const fontConfig =
      FONT_PAIRINGS.find((item) => item.id === state.fontPairing) ?? FONT_PAIRINGS[0];
    root.style.setProperty("--ds-font-display", `${fontConfig.displayCssVar}, Georgia, serif`);
    root.style.setProperty("--ds-font-body", `${fontConfig.bodyCssVar}, system-ui, sans-serif`);
    root.style.setProperty("--ds-font-scale", FONT_SCALE_VALUES[state.fontScale].factor);
    root.style.setProperty("--ds-density-gap", DENSITY_VALUES[state.density].gap);
    root.style.setProperty("--ds-card-pad", DENSITY_VALUES[state.density].cardPad);
  }, [state]);

  // Persist user preference edits locally and to Supabase `/api/account/preferences`
  useEffect(() => {
    if (userMutationSeq === 0) return;

    try {
      window.localStorage.setItem(
        `${STORAGE_KEY_PREFIX}${state.environment}`,
        JSON.stringify(state),
      );
    } catch {
      // Ignore storage quota errors
    }

    if (!isSupabaseClientConfigured()) return;

    const timer = window.setTimeout(() => {
      void fetch("/api/account/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          palette: state.palette,
          colorMode: state.mode,
          fontPairing: state.fontPairing,
          fontScale: state.fontScale,
          density: state.density,
          bubbleStyle: state.bubbleStyle,
          chatBackground: state.chatBackground,
          reducedMotion: state.reducedMotion,
          discreetNotifs: state.discreetNotifications,
          soundEnabled: state.soundEnabled,
          callAlerts: state.callAlerts,
        }),
      }).catch(() => {});
    }, 350);

    return () => window.clearTimeout(timer);
  }, [state, userMutationSeq]);

  const value = useMemo<DesignSystemContextValue>(() => {
    const mutate = (updater: (prev: DesignSystemState) => DesignSystemState) => {
      setState(updater);
      setUserMutationSeq((n) => n + 1);
    };

    return {
      ...state,
      setEnvironment: (environment) =>
        setState((prev) => {
          if (prev.environment === environment) return prev;
          let cached: Partial<typeof prev> | null = null;
          if (typeof window !== "undefined") {
            try {
              const raw = window.localStorage.getItem(`${STORAGE_KEY_PREFIX}${environment}`);
              if (raw) {
                cached = JSON.parse(raw) as Partial<typeof prev>;
              }
            } catch {}
          }
          const next = { ...prev, ...(cached ?? {}), environment };
          if (environment === "editorial") {
            next.palette = cached?.palette ?? "editorial";
            next.fontPairing = cached?.fontPairing ?? "editorial-playfair";
          } else {
            next.palette =
              cached?.palette && cached.palette !== "editorial"
                ? cached.palette
                : prev.palette === "editorial"
                  ? "ivory"
                  : prev.palette;
            next.fontPairing =
              cached?.fontPairing && cached.fontPairing !== "editorial-playfair"
                ? cached.fontPairing
                : prev.fontPairing === "editorial-playfair"
                  ? "intimate-lora"
                  : prev.fontPairing;
          }
          return next;
        }),
      setPalette: (palette) => mutate((prev) => ({ ...prev, palette })),
      setMode: (mode) => mutate((prev) => ({ ...prev, mode })),
      toggleMode: () =>
        mutate((prev) => ({ ...prev, mode: prev.mode === "light" ? "dark" : "light" })),
      setFontPairing: (fontPairing) => mutate((prev) => ({ ...prev, fontPairing })),
      setFontScale: (fontScale) => mutate((prev) => ({ ...prev, fontScale })),
      setDensity: (density) => mutate((prev) => ({ ...prev, density })),
      setBubbleStyle: (bubbleStyle) => mutate((prev) => ({ ...prev, bubbleStyle })),
      setChatBackground: (chatBackground) => mutate((prev) => ({ ...prev, chatBackground })),
      setReducedMotion: (reducedMotion) => mutate((prev) => ({ ...prev, reducedMotion })),
      setDiscreetNotifications: (discreetNotifications) =>
        mutate((prev) => ({ ...prev, discreetNotifications })),
      setSoundEnabled: (soundEnabled) => mutate((prev) => ({ ...prev, soundEnabled })),
      setCallAlerts: (callAlerts) => mutate((prev) => ({ ...prev, callAlerts })),
      resetDefaults: (env) =>
        mutate((prev) => {
          const target = env ?? prev.environment;
          return target === "private" ? DEFAULT_PRIVATE_STATE : DEFAULT_EDITORIAL_STATE;
        }),
    };
  }, [state]);

  return (
    <DesignSystemContext.Provider value={value}>
      <MotionConfig reducedMotion={state.reducedMotion ? "always" : "user"}>
        {children}
      </MotionConfig>
    </DesignSystemContext.Provider>
  );
}

/**
 * Returns active theme tokens, personalisation controls, and motion preferences.
 */
export function useDesignSystem(): DesignSystemContextValue {
  const ctx = useContext(DesignSystemContext);
  if (!ctx) {
    throw new Error("useDesignSystem must be used inside DesignSystemProvider.");
  }
  return ctx;
}

