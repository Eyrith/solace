# Design System & UI/UX Specification

**Document Status:** v1.0 (Division 02 — Design System & UI/UX)  
**Target Environments:**
- **Experience A (`www`):** Public Editorial Discovery Portal  
- **Experience B (`app`):** Private Communication & Shared Sanctuary  
**Core Stack:** Next.js App Router, TypeScript, Tailwind CSS v4, shadcn/ui primitives (Radix-accessible), Lucide React icons, Framer Motion

---

## 1. Visual Identity & Dual-Environment Philosophy

Both experiences live inside one cohesive product while feeling unmistakably different in purpose, cadence, and atmosphere.

### Experience A — Public Editorial Discovery Portal (`editorial`)
- **Mood:** Gallery paper, architectural ink, thoughtful restraint, print-magazine composure.
- **Layout Principle:** Asymmetric 12-column editorial grid with crisp hairline rules (`1px solid var(--border)`), generous negative space, and a strict `65–72ch` reading measure.
- **Navigation:** Minimal, non-sticky or lightly translucent header with primary discipline links (*Discover*, *Psychology*, *Relationships*, *Philosophy*, *Science*, *Literature*, *Publications*) and a single discreet **Sign in** action.
- **Discretion:** Looks purely like an intellectual reading magazine. Zero relationship or private-chat aesthetics appear on public routes.

### Experience B — Private Communication & Shared Sanctuary (`ivory` / `beige` / `burgundy` / `sage` / `lavender` / `charcoal` / `dusty-rose` / `warm-grey`)
- **Mood:** Warm paper, quiet evening light, personal letter-writing, calm tactile comfort.
- **Layout Principle:** Adaptive calm workspace—clean sidebar (`>=1024px`) or streamlined bottom navigation (`<=5` primary destinations on `<1024px`), soft organic radii (`12px–20px`), and breathable message padding.
- **Personalisation:** Users choose from curated, WCAG-verified palettes, Light/Dark modes, curated typography pairings, chat bubble styles, calm textured/solid chat backgrounds, interface density, and reduced-motion preferences.

### Intentional Anti-Patterns (Avoided by Design)
- **No generic SaaS card grids** with identical `rgba(0,0,0,0.1)` shadows and decorative gradient washes.
- **No AI template chrome:** Avoid tracked-out ALL-CAPS eyebrow labels above every heading, `01 / 02 / 03` sequence numbers on non-sequential cards, `A · B · C` middle-dot metadata strings everywhere, `→` arrows appended to button labels, or spotlighting single italic colored words in headings.
- **No emojis as UI icons:** Every interface icon comes from one consistent SVG stroke family (`lucide-react`, `1.75px` stroke width).
- **No color-only meaning:** Statuses (error, verified, disappearing active, reconnecting) always combine color with icon and/or clear text.

---

## 2. Layout Concepts & Spatial Wireframes

### Experience A — Public Editorial Front Page (Left-Aligned Architectural Grid)
```text
+------------------------------------------------------------------------------+
| [Brand Wordmark]    Discover  Topics v  Publications   Search      [Sign in] |
+------------------------------------------------------------------------------+
|                                                                              |
|  LEAD FEATURED ESSAY (8 cols)              | CURATED INDEX (4 cols)          |
|  Serif Display Headline (Playfair/Cormorant)| Clean stacked reading rows     |
|  Author, Publication, Date, Duration       | separated by 1px hairline rules |
|  2–3 line editorial excerpt (68ch max)     | (no heavy enclosing boxes)      |
|  [Read at Aeon]  [Save]                    |                                 |
+--------------------------------------------+---------------------------------+
|  DISCIPLINE READING SHELF (3-col / 2-col responsive editorial flow)          |
+------------------------------------------------------------------------------+
```

### Experience B — Private Sanctuary Shell (Desktop Sidebar + Conversational Workspace)
```text
+------------------+-----------------------------------------------------------+
| Space Switcher   | [Partner / Space Title]      [Search] [Pin] [Call] [Prefs]|
|                  +-----------------------------------------------------------+
|  Messages        |                                                           |
|  Questions       |   Calm, softly padded message stream                      |
|  Games           |   - Received bubble (left, soft surface)                  |
|  Shared Space    |   - Sent bubble (right, primary accent surface)           |
|  Private Journal |   - Optional reply quote, voice waveform, expiry timer    |
|                  |                                                           |
|                  +-----------------------------------------------------------+
|  Settings        | [+] [Disappearing] [Message input...]        [Mic] [Send] |
+------------------+-----------------------------------------------------------+
```
On viewports `< 1024px`, the sidebar collapses into a fixed bottom navigation bar (`<= 5` top-level items with icon + short label) and a top sheet/drawer for secondary settings & Space Switcher, respecting `env(safe-area-inset-bottom)` and `min-h-dvh`.

---

## 3. Colour System & Verified Palettes

All tokens are defined as semantic CSS variables (`--background`, `--card`, `--muted`, `--foreground`, `--muted-foreground`, `--border`, `--primary`, `--primary-foreground`, `--accent`, `--accent-foreground`, `--destructive`, `--destructive-foreground`, `--success`, `--warning`, `--ring`, `--bubble-sent`, `--bubble-sent-foreground`, `--bubble-received`, `--bubble-received-foreground`). Components **never** use raw hex values.

Every foreground/background and button text pair below has been verified mathematically to exceed **WCAG 2.1 AA (`>= 4.5:1`)** — with primary reading text exceeding **13:1**.

### 3.1 Public Editorial Default (`editorial`)

| Mode | `--background` | `--card` | `--muted` | `--foreground` | `--muted-foreground` | `--border` | `--primary` | `--primary-foreground` | `--accent` |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Light** | `#FBFBF9` | `#FFFFFF` | `#F2F1EC` | `#16171A` *(17.3:1)* | `#52555E` *(7.2:1)* | `#E3E1DA` | `#1E2936` | `#FBFBF9` *(14.2:1)* | `#2F4840` |
| **Dark** | `#141518` | `#1B1D21` | `#23262B` | `#F2F0EB` *(16.0:1)* | `#A7ABB4` *(7.9:1)* | `#2E3138` | `#E4E0D6` | `#141518` *(13.9:1)* | `#8EB8A8` |

### 3.2 Private Sanctuary Palettes (Light & Dark Modes)

| Palette | Mode | `--background` | `--card` | `--muted` | `--foreground` | `--muted-foreground` | `--border` | `--primary` | `--primary-foreground` | `--bubble-sent` / Text |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Ivory** | Light | `#FAF7F0` | `#FFFDF9` | `#F0EBE0` | `#24201B` *(15.1:1)* | `#5E554B` *(6.8:1)* | `#E4DDD0` | `#3D342B` | `#FFFDF9` *(12.0:1)* | `#3D342B` / `#FFFDF9` |
| **Ivory** | Dark | `#1B1916` | `#23201C` | `#2D2923` | `#F4EFE6` *(15.3:1)* | `#B6ADA0` *(7.9:1)* | `#38332B` | `#E6DCCB` | `#1B1916` *(12.9:1)* | `#4B4034` / `#F8F4EC` *(9.2:1)* |
| **Beige** | Light | `#F3EDE2` | `#FAF6EE` | `#E7DEC8` | `#26211A` *(13.7:1)* | `#5B5144` *(6.7:1)* | `#D8CEBC` | `#5E4632` | `#FAF6EE` *(8.1:1)* | `#5E4632` / `#FAF6EE` |
| **Beige** | Dark | `#1D1915` | `#26211C` | `#312A23` | `#F2EAE0` *(14.7:1)* | `#B5AA9C` *(7.7:1)* | `#3D352D` | `#DECBB4` | `#1D1915` *(11.1:1)* | `#5C4836` / `#FAF6EE` *(8.0:1)* |
| **Burgundy** | Light | `#FAF5F6` | `#FFFFFF` | `#F1E6E8` | `#26191D` *(15.7:1)* | `#664B52` *(7.2:1)* | `#E5D4D8` | `#6E2837` | `#FFF8F9` *(9.9:1)* | `#6E2837` / `#FFF8F9` |
| **Burgundy** | Dark | `#191215` | `#23191D` | `#2E2126` | `#F5ECEF` *(15.9:1)* | `#C3A8B0` *(8.4:1)* | `#3C2C32` | `#DFA6B2` | `#191215` *(9.0:1)* | `#6B2C3B` / `#FDF7F8` *(9.7:1)* |
| **Sage** | Light | `#F4F7F4` | `#FCFDFC` | `#E5ECE6` | `#19241D` *(14.8:1)* | `#485B4F` *(6.7:1)* | `#D2DED5` | `#355442` | `#F9FCF9` *(8.1:1)* | `#355442` / `#F9FCF9` |
| **Sage** | Dark | `#121814` | `#1A221D` | `#232E27` | `#ECF2ED` *(15.9:1)* | `#A2B6A8` *(8.4:1)* | `#2E3D34` | `#9CC2AA` | `#121814` *(9.2:1)* | `#2D4A39` / `#F3F8F4` *(9.1:1)* |
| **Lavender** | Light | `#F7F5FA` | `#FDFCFE` | `#EAE5F3` | `#201B2B` *(15.5:1)* | `#544B69` *(7.5:1)* | `#DDD5EB` | `#4F3F73` | `#FAF9FD` *(8.7:1)* | `#4F3F73` / `#FAF9FD` |
| **Lavender** | Dark | `#15131C` | `#1E1B28` | `#282436` | `#F0ECF8` *(15.8:1)* | `#B3AAC9` *(8.3:1)* | `#352F47` | `#C2B5E3` | `#15131C` *(9.6:1)* | `#493C6A` / `#F7F5FC` *(9.1:1)* |
| **Charcoal** | Light | `#F4F4F5` | `#FFFFFF` | `#E5E5E8` | `#18181B` *(16.1:1)* | `#52525B` *(7.0:1)* | `#D4D4D8` | `#27272A` | `#FAFAFA` *(14.3:1)* | `#27272A` / `#FAFAFA` |
| **Charcoal** | Dark | `#121316` | `#1A1C20` | `#24272C` | `#F1F2F4` *(16.6:1)* | `#A1A6B0` *(7.6:1)* | `#2E3239` | `#E4E5E9` | `#121316` *(14.8:1)* | `#333740` / `#F7F8FA` *(11.2:1)* |
| **Dusty Rose** *(extended)* | Light | `#FBF6F7` | `#FFFFFF` | `#F3E7EA` | `#271B1E` *(15.6:1)* | `#694D54` *(7.0:1)* | `#E7D4D9` | `#7D4350` | `#FFF9FA` *(7.2:1)* | `#7D4350` / `#FFF9FA` |
| **Dusty Rose** *(extended)* | Dark | `#1A1315` | `#241A1D` | `#302226` | `#F6EEF0` *(16.0:1)* | `#C6AAB1` *(8.5:1)* | `#3F2E33` | `#DDAEB8` | `#1A1315` *(9.4:1)* | `#6B3A45` / `#FCF7F8` *(8.6:1)* |
| **Warm Grey** *(extended)* | Light | `#F6F5F3` | `#FFFFFF` | `#E8E6E1` | `#1D1C1A` *(15.6:1)* | `#585550` *(6.8:1)* | `#D9D6CF` | `#44413C` | `#FAF9F7` *(9.7:1)* | `#44413C` / `#FAF9F7` |
| **Warm Grey** *(extended)* | Dark | `#151412` | `#1E1D1A` | `#282622` | `#F1F0ED` *(16.2:1)* | `#ACA8A1` *(7.8:1)* | `#36332E` | `#D9D6CE` | `#151412` *(12.7:1)* | `#3D3A35` / `#F6F5F3` *(10.4:1)* |

### 3.3 Semantic Feedback Tokens

| Semantic Role | Light Background / Foreground | Dark Background / Foreground |
| :--- | :--- | :--- |
| **Destructive** | `#B91C1C` / `#FFFFFF` *(6.5:1)* | `#991B1B` / `#FEF2F2` *(7.6:1)* |
| **Success** | `#166534` / `#FFFFFF` *(7.1:1)* | `#14532D` / `#ECFDF5` |
| **Warning** | `#D97706` / `#1C1917` *(5.5:1)* | `#B45309` / `#FFFBEB` |

---

## 4. Typography System

All six specified fonts are loaded via `next/font/google` (self-hosted at build time, `display: "swap"`, zero external runtime font network requests or layout shift):

- **Serif Faces:** `Playfair Display`, `Cormorant Garamond`, `Lora`
- **Sans Faces:** `DM Sans`, `Inter`, `Manrope`

### 4.1 Curated Typography Pairings

| Pairing ID | Display / Heading | Body / UI | Character & Best Use |
| :--- | :--- | :--- | :--- |
| `editorial-playfair` *(Public Default)* | **Playfair Display** | **Inter** | High-contrast modern magazine authority; crisp editorial summaries & UI controls. |
| `literary-cormorant` | **Cormorant Garamond** | **DM Sans** | Poetic, gallery-press elegance; ideal for long letters & serene reading. |
| `intimate-lora` *(Private Default)* | **Lora** | **DM Sans** | Warm calligraphic serif for reflections/prompts paired with friendly geometric sans for chat. |
| `classic-serif` | **Lora** | **Lora** | Quiet all-serif literary immersion for letters and long-form journals. |
| `modern-manrope` | **Manrope** | **Manrope** | Soft, understated contemporary sans across chat and daily utilities. |
| `architect-inter` | **Inter** | **Inter** | Ultra-clean neutral precision for high-density focus. |

### 4.2 Type Scale & Reading Rules

| Token | Size (`rem` / `px`) | Line Height | Letter Spacing | Usage |
| :--- | :--- | :--- | :--- | :--- |
| `display-xl` | `clamp(2.25rem, 4vw, 3.5rem)` (`36–56px`) | `1.08` | `-0.025em` | Public hero lead essay title |
| `h1` | `clamp(1.75rem, 2.6vw, 2.375rem)` (`28–38px`) | `1.16` | `-0.02em` | Section title, space header |
| `h2` | `1.5rem` (`24px`) | `1.25` | `-0.015em` | Card lead titles, dialog headings |
| `h3` | `1.1875rem` (`19px`) | `1.32` | `-0.01em` | Subsection headers, prompt cards |
| `body-lg` | `1.0625rem` (`17px`) | `1.65` | `0em` | Editorial abstracts, digital letters |
| `body` | `1rem` (`16px`) | `1.55` | `0em` | Minimum base text (prevents mobile iOS input zoom) |
| `body-sm` | `0.875rem` (`14px`) | `1.5` | `0.005em` | Compact descriptions, secondary UI, chat metadata |
| `caption` | `0.75rem` (`12px`) | `1.4` | `0.015em` | Minimum allowed label size (`>= 12px`); timestamps & countdowns use `tabular-nums` |

**User Font Scale Multipliers (Private App):** `small` (`0.9375`), `default` (`1.0`), `large` (`1.0625`), `xlarge` (`1.125`) applied cleanly via `--ds-font-scale`.  
**Measure Limits:** Editorial body prose capped at `max-w-[68ch]`. Short headings use `text-wrap: balance`. Long tokens/URLs use `overflow-wrap: anywhere`.

---

## 5. Spacing, Radii, Elevation & Density

- **4px Base Grid:** `4px (1)`, `8px (2)`, `12px (3)`, `16px (4)`, `20px (5)`, `24px (6)`, `32px (8)`, `40px (10)`, `48px (12)`, `64px (16)`, `96px (24)`.
- **Container Widths:** Public reading container `max-w-6xl` (`1152px`); Private workspace `max-w-7xl` (`1280px`) with central chat column `max-w-3xl`.
- **Interface Density (Private App):**
  - `compact`: tighter bubble/list padding (`--ds-density-gap: 0.5rem`, `--ds-card-pad: 0.875rem`)
  - `comfortable` *(default)*: `--ds-density-gap: 0.75rem`, `--ds-card-pad: 1.25rem`
  - `spacious`: `--ds-density-gap: 1.125rem`, `--ds-card-pad: 1.625rem`
- **Border Radius Discipline:**
  - Public Editorial uses restrained `0px`–`6px` corners (`rounded-sm` / `rounded-md`) for sharp print structure.
  - Private Sanctuary uses softer `12px`–`20px` corners (`rounded-xl` / `rounded-2xl`) and bubble-specific asymmetric corners.
- **Elevation Ladder:** Mostly flat surface stepping (`--background` -> `--card` + `1px` `--border`), reserving soft diffused shadows exclusively for floating menus, modals, and incoming call overlays (`z-index`: base `0`, sticky header `20`, dropdown/popover `30`, modal/sheet `40`, toast/call overlay `50`).

---

## 6. Motion & Micro-Interaction Rules

- **Library:** Framer Motion wrapped by a central `<MotionConfig reducedMotion="user">` + user preference override.
- **Tokens:**
  - `fast` (`140ms`, ease-out `[0.22, 1, 0.36, 1]`): button presses, focus transitions, badge toggles.
  - `normal` (`220ms`, ease-out): modal/drawer reveal, tab switches, chat bubble appearance.
  - `gentle` (`320ms`, spring `stiffness: 320, damping: 30`): theme panel transition, blind-answer reveal flip.
- **Rules:**
  - Animate only GPU-composited `transform` and `opacity` (never `width` or `height` layout thrash).
  - Exit transitions run ~65% of enter duration.
  - Never block input or rely on `onAnimationComplete` for state correctness.
  - **Reduced Motion:** Both OS `prefers-reduced-motion: reduce` and the in-app Reduced Motion toggle collapse positional motion into instant/minimal opacity fades (`0ms`–`80ms`).

---

## 7. Core Component Specifications

1. **Buttons (`Button`):**
   - Variants: `primary`, `secondary`, `outline`, `ghost`, `subtle`, `destructive`.
   - Sizes: `sm` (`36px` visual / `44px` hit target on touch), `md` (`40px` / `44px` mobile), `lg` (`48px`), `icon` (`40px` desktop / `44px` touch).
   - States: `default`, `hover`, `active` (`scale-[0.98]`), `focus-visible` (`2px` solid `--ring` with `2px` offset), `disabled` (`opacity-50 pointer-events-none`), `loading` (replaces/prepends subtle spinner, preserves button width to avoid jitter, sets `aria-busy="true"`).
   - Icon-only buttons **must** require an explicit `aria-label`.

2. **Inputs & Forms (`Input`, `Textarea`, `Select`, `Switch`, `FormField`, `ErrorSummary`):**
   - Minimum `44px` touch height on mobile, `16px` font size to prevent iOS auto-zoom.
   - Always render visible `<label htmlFor="...">` (never placeholder-only).
   - Helper text and inline error message bound via `aria-describedby` + `aria-invalid="true"`.
   - Password inputs include an accessible `"Show password"` / `"Hide password"` button with `aria-pressed`.
   - Multi-field validation failures render a focusable `<ErrorSummary role="alert" tabIndex={-1}>` linking directly to invalid field IDs.

3. **Cards (`EditorialCard`, `EditorialRow`, `PublicationCard`, `SanctuaryCard`):**
   - **Public Editorial Feature Card:** Hairline border or subtle surface contrast, serif headline, single-line attribution (`Publication · Author · Date · Reading time` separated gracefully without noisy badges), 2–3 line excerpt, Save bookmark icon button + outbound link action.
   - **Public Compact Essay Row:** Borderless stacked list separated by `1px` horizontal rules for curated indexes and search results.
   - **Private Sanctuary Card:** Soft rounded container (`16px`), calm surface contrast, generous inner padding scaled by density token.

4. **Navigation (`PublicHeader`, `PrivateSidebar`, `PrivateBottomNav`, `SpaceSwitcher`):**
   - **Public Header:** Brand wordmark, concise topic/directory links, Search button, discreet `"Sign in"` link. Collapses into a clean keyboard-trapped mobile drawer `< 1024px`.
   - **Private Sidebar (`>= 1024px`) & Bottom Nav (`< 1024px`):** Maximum 5 top-level destinations (*Messages*, *Questions*, *Games*, *Shared*, *Journal*), active route indicator (color + weight + hairline pill), and a clean Space Switcher at top.

5. **Dialogues, Modals & Sheets (`Dialog`, `ConfirmDialog`):**
   - Accessible focus trap, `ESC` dismissal, backdrop blur strictly signaling background dismissal (`backdrop-blur-xs`).
   - Destructive confirmations separate primary cancel action from destructive confirm action (`variant="destructive"`).
   - Unsaved-changes guard triggers confirmation before closing edited letters/notes.

6. **Chat Bubbles & Messaging Primitives (`ChatBubble`, `ChatComposer`, `VoiceNotePlayer`, `TypingIndicator`, `DisappearingBadge`):**
   - Bubble style variants: `soft` (classic asymmetric rounded corners), `editorial` (clean lightly bordered note cards), `pill` (high-radius minimal), `minimal` (borderless calm typographic blocks).
   - Chat backgrounds: `solid`, `linen-grain` (subtle CSS paper texture), `botanical-tint` (soft radial atmospheric wash — very subtle, zero noise).
   - Includes contextual reply preview, reaction chips (minimum `28px` height with accessible `aria-pressed` counts), edited label, read receipt status icon+label, voice playback controls (`play/pause`, scrubber range, `tabular-nums` time, `1x/1.5x/2x` speed toggle), and disappearing timer badge with live tabular countdown.

7. **Loading, Error & Empty States (`Skeleton`, `InlineBanner`, `EmptyState`):**
   - Skeletons mirror exact target dimensions (avatar + bubble widths or editorial article blocks) with subtle CSS pulse (halted under reduced motion).
   - Errors never apologize vaguely; they state clearly what failed and provide a concrete action button (*Retry*, *Review fields*, *Check permissions*).
   - Empty states provide calm typography, one illustrative Lucide icon (`aria-hidden="true"`), plain guidance, and at most one primary CTA.

---

## 8. Responsive & Accessibility Requirements Matrix

| Criterion | Target Standard | Implementation Enforcement |
| :--- | :--- | :--- |
| **Breakpoints** | `375px`, `640px`, `768px`, `1024px`, `1280px`, `1440px` | Mobile-first Tailwind utilities; zero horizontal overflow (`overflow-x-hidden` avoided as bandaid—fix grids properly) |
| **Viewport Height** | Mobile browser bar friendly | Use `min-h-dvh` instead of `100vh` |
| **Target Sizes** | `>= 44×44px` mobile touch, `>= 24×24px` WCAG 2.2 AA web | Enforced on buttons, nav tabs, close buttons, toggles |
| **Text Contrast** | `>= 4.5:1` body/UI, `>= 3:1` large text & focus rings | Verified mathematically across all 8 palettes × Light/Dark |
| **Focus Visibility** | Focus never obscured by sticky headers/footers | `scroll-padding-top` on scroll container + `2px` `--ring` with `2px` offset |
| **Screen Readers** | Semantic landmarks, live regions | `aria-live="polite"` for typing/toast/new-message announcements; `role="alert"` for errors |
| **Reduced Motion** | OS + User setting honored | `@media (prefers-reduced-motion: reduce)` + `[data-reduced-motion="true"]` |

