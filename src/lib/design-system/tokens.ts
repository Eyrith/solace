export type EnvironmentMode = "editorial" | "private";

export type ThemeMode = "light" | "dark" | "system";

export type PaletteId =
  | "editorial"
  | "ivory"
  | "kulfi"
  | "beige"
  | "burgundy"
  | "sage"
  | "lavender"
  | "charcoal"
  | "dusty-rose"
  | "warm-grey";

export type FontPairingId =
  | "editorial-playfair"
  | "literary-cormorant"
  | "intimate-lora"
  | "classic-serif"
  | "modern-manrope"
  | "architect-inter";

export type FontScaleId = "small" | "default" | "large" | "xlarge";

export type DensityId = "compact" | "comfortable" | "spacious";

export type BubbleStyleId = "soft" | "editorial" | "pill" | "minimal";

export type ChatBackgroundId = "solid" | "linen" | "botanical";

export interface PaletteMeta {
  id: PaletteId;
  name: string;
  description: string;
  environment: "public" | "private";
  lightSwatch: string;
  darkSwatch: string;
  contrastNote: string;
}

export const PALETTES: readonly PaletteMeta[] = [
  {
    id: "editorial",
    name: "Gallery Ink",
    description: "Crisp gallery paper and architectural slate ink for public editorial reading.",
    environment: "public",
    lightSwatch: "#1E2936",
    darkSwatch: "#E4E0D6",
    contrastNote: "17.3:1 light / 16.0:1 dark",
  },
  {
    id: "ivory",
    name: "Warm Ivory",
    description: "Soft archival paper warmth paired with deep espresso ink.",
    environment: "private",
    lightSwatch: "#3D342B",
    darkSwatch: "#E6DCCB",
    contrastNote: "15.1:1 light / 15.3:1 dark",
  },
  {
    id: "kulfi",
    name: "Kulfi Bedtime",
    description: "Cozy saffron cream, cardamom warmth, and pistachio accents for late-night banter.",
    environment: "private",
    lightSwatch: "#E07A5F",
    darkSwatch: "#F28E6F",
    contrastNote: "16.4:1 light / 15.8:1 dark",
  },
  {
    id: "beige",
    name: "Beige Linen",
    description: "Natural linen tones and grounded toasted walnut accents.",
    environment: "private",
    lightSwatch: "#5E4632",
    darkSwatch: "#DECBB4",
    contrastNote: "13.7:1 light / 14.7:1 dark",
  },
  {
    id: "burgundy",
    name: "Muted Burgundy",
    description: "Quiet oxblood wine balanced by serene parchment neutrals.",
    environment: "private",
    lightSwatch: "#6E2837",
    darkSwatch: "#DFA6B2",
    contrastNote: "15.7:1 light / 15.9:1 dark",
  },
  {
    id: "sage",
    name: "Botanical Sage",
    description: "Restorative botanical greens tuned for effortless visual calm.",
    environment: "private",
    lightSwatch: "#355442",
    darkSwatch: "#9CC2AA",
    contrastNote: "14.8:1 light / 15.9:1 dark",
  },
  {
    id: "lavender",
    name: "Soft Lavender",
    description: "Twilight plum-lavender surfaces with poised evening readability.",
    environment: "private",
    lightSwatch: "#4F3F73",
    darkSwatch: "#C2B5E3",
    contrastNote: "15.5:1 light / 15.8:1 dark",
  },
  {
    id: "charcoal",
    name: "Architectural Charcoal",
    description: "Low-glare graphite and alabaster minimalism.",
    environment: "private",
    lightSwatch: "#27272A",
    darkSwatch: "#E4E5E9",
    contrastNote: "16.1:1 light / 16.6:1 dark",
  },
  {
    id: "dusty-rose",
    name: "Dusty Rose",
    description: "Muted rose-tinted paper warmth for unhurried correspondence.",
    environment: "private",
    lightSwatch: "#7D4350",
    darkSwatch: "#DDAEB8",
    contrastNote: "15.6:1 light / 16.0:1 dark",
  },
  {
    id: "warm-grey",
    name: "Warm Grey",
    description: "Tactile stone neutrality built for quiet concentration.",
    environment: "private",
    lightSwatch: "#44413C",
    darkSwatch: "#D9D6CE",
    contrastNote: "15.6:1 light / 16.2:1 dark",
  },
] as const;

export interface FontPairingMeta {
  id: FontPairingId;
  name: string;
  headingFamily: string;
  bodyFamily: string;
  displayCssVar: string;
  bodyCssVar: string;
  character: string;
}

export const FONT_PAIRINGS: readonly FontPairingMeta[] = [
  {
    id: "editorial-playfair",
    name: "Playfair Display + Inter",
    headingFamily: "Playfair Display",
    bodyFamily: "Inter",
    displayCssVar: "var(--font-playfair)",
    bodyCssVar: "var(--font-inter)",
    character: "High-contrast magazine authority with crisp UI clarity",
  },
  {
    id: "literary-cormorant",
    name: "Cormorant Garamond + DM Sans",
    headingFamily: "Cormorant Garamond",
    bodyFamily: "DM Sans",
    displayCssVar: "var(--font-cormorant)",
    bodyCssVar: "var(--font-dm-sans)",
    character: "Poetic gallery-press serif paired with soft geometric sans",
  },
  {
    id: "intimate-lora",
    name: "Lora + DM Sans",
    headingFamily: "Lora",
    bodyFamily: "DM Sans",
    displayCssVar: "var(--font-lora)",
    bodyCssVar: "var(--font-dm-sans)",
    character: "Warm calligraphic serif paired with approachable conversation sans",
  },
  {
    id: "classic-serif",
    name: "Lora + Lora",
    headingFamily: "Lora",
    bodyFamily: "Lora",
    displayCssVar: "var(--font-lora)",
    bodyCssVar: "var(--font-lora)",
    character: "Quiet all-serif literary immersion for letters and journals",
  },
  {
    id: "modern-manrope",
    name: "Manrope + Manrope",
    headingFamily: "Manrope",
    bodyFamily: "Manrope",
    displayCssVar: "var(--font-manrope)",
    bodyCssVar: "var(--font-manrope)",
    character: "Soft, understated contemporary sans across chat and utilities",
  },
  {
    id: "architect-inter",
    name: "Inter + Inter",
    headingFamily: "Inter",
    bodyFamily: "Inter",
    displayCssVar: "var(--font-inter)",
    bodyCssVar: "var(--font-inter)",
    character: "Ultra-clean precision for high-density workflows",
  },
] as const;

export const FONT_SCALE_VALUES: Record<FontScaleId, { label: string; factor: string }> = {
  small: { label: "Small (15px)", factor: "0.9375" },
  default: { label: "Default (16px)", factor: "1" },
  large: { label: "Large (17px)", factor: "1.0625" },
  xlarge: { label: "Extra Large (18px)", factor: "1.125" },
};

export const DENSITY_VALUES: Record<DensityId, { label: string; gap: string; cardPad: string }> = {
  compact: { label: "Compact", gap: "0.5rem", cardPad: "0.875rem" },
  comfortable: { label: "Comfortable", gap: "0.75rem", cardPad: "1.25rem" },
  spacious: { label: "Spacious", gap: "1.125rem", cardPad: "1.625rem" },
};

export const BUBBLE_STYLES: readonly { id: BubbleStyleId; label: string; description: string }[] = [
  { id: "soft", label: "Soft Rounded", description: "Asymmetric gentle corners for natural rhythm" },
  { id: "editorial", label: "Editorial Note", description: "Restrained architectural corners with subtle border" },
  { id: "pill", label: "Pill", description: "Generously rounded tactile capsules" },
  { id: "minimal", label: "Minimal Rule", description: "Borderless quiet typographic blocks with left/right rule" },
];

export const CHAT_BACKGROUNDS: readonly { id: ChatBackgroundId; label: string }[] = [
  { id: "solid", label: "Calm Solid" },
  { id: "linen", label: "Warm Linen Grain" },
  { id: "botanical", label: "Soft Atmospheric Wash" },
];

