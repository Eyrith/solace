"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
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
  type PaletteId,
  type ThemeMode,
} from "@/lib/design-system/tokens";

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
};

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

  const value = useMemo<DesignSystemContextValue>(
    () => ({
      ...state,
      setEnvironment: (environment) =>
        setState((prev) => ({
          ...prev,
          environment,
          palette:
            environment === "editorial"
              ? "editorial"
              : prev.palette === "editorial"
                ? "ivory"
                : prev.palette,
          fontPairing:
            environment === "editorial"
              ? "editorial-playfair"
              : prev.fontPairing === "editorial-playfair"
                ? "intimate-lora"
                : prev.fontPairing,
        })),
      setPalette: (palette) => setState((prev) => ({ ...prev, palette })),
      setMode: (mode) => setState((prev) => ({ ...prev, mode })),
      toggleMode: () =>
        setState((prev) => ({ ...prev, mode: prev.mode === "light" ? "dark" : "light" })),
      setFontPairing: (fontPairing) => setState((prev) => ({ ...prev, fontPairing })),
      setFontScale: (fontScale) => setState((prev) => ({ ...prev, fontScale })),
      setDensity: (density) => setState((prev) => ({ ...prev, density })),
      setBubbleStyle: (bubbleStyle) => setState((prev) => ({ ...prev, bubbleStyle })),
      setChatBackground: (chatBackground) => setState((prev) => ({ ...prev, chatBackground })),
      setReducedMotion: (reducedMotion) => setState((prev) => ({ ...prev, reducedMotion })),
      setDiscreetNotifications: (discreetNotifications) =>
        setState((prev) => ({ ...prev, discreetNotifications })),
      resetDefaults: (env) =>
        setState((prev) => {
          const target = env ?? prev.environment;
          return target === "private" ? DEFAULT_PRIVATE_STATE : DEFAULT_EDITORIAL_STATE;
        }),
    }),
    [state],
  );

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

