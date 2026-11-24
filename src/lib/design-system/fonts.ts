import { Playfair_Display, Lora, DM_Sans } from "next/font/google";

/**
 * Self-hosted Google Fonts via next/font/google:
 * - Playfair Display: public lead headline and masthead only (weight 600)
 * - Lora: private headings and editorial body (weights 400, 500)
 * - DM Sans: UI text and chat (weight 400)
 * Four weights total across the application.
 */

export const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--font-playfair",
  display: "swap",
});

export const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-lora",
  display: "swap",
});

export const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-dm-sans",
  display: "swap",
});

// Backward-compatible variable references for legacy imports
export const cormorantGaramond = { variable: playfairDisplay.variable };
export const inter = { variable: dmSans.variable };
export const manrope = { variable: dmSans.variable };

/**
 * Combined font CSS variable class string applied to the root <html> element.
 */
export const allFontVariables = [
  playfairDisplay.variable,
  lora.variable,
  dmSans.variable,
].join(" ");
