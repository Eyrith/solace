# Project00 — Development Roadmap

> Living document. Updated at the start of each division.

---

## Phased Delivery

### ✅ Phase 1 — Foundation (Complete)
- Product discovery docs (`docs/`)
- Design system (tokens, palettes, typography, all UI primitives)
- Editorial components (PublicShell, ArticleCard, PublicationCard)
- Sanctuary components (PrivateShell, ChatBubble, ChatComposer, VoiceNotePlayer)
- Next.js project scaffold (Tailwind v4, TypeScript, build passing)

### ✅ Phase 2 — Architecture & Infrastructure (Complete)
- Architecture documentation ✅
- Database schema documentation (all 20 tables + stored procedures) ✅
- Security plan & RLS policies ✅
- `.env.example` & package installations (@supabase/ssr, livekit-server-sdk, etc.) ✅
- Database migrations (`001_initial_schema.sql`) ✅
- Proxy host routing (`src/proxy.ts` for Next.js 16) ✅
- Supabase client & server factories with offline/demo resilience ✅

### ✅ Phase 3 — Authentication & Private Spaces (Complete)
- Discreet reader login (`/auth/login`) & registration (`/auth/register`) ✅
- Private sanctuary login (`/sanctuary/login`) & registration (`/sanctuary/register`) ✅
- Single-use invite claim system (`/invite/[token]`) with 2-member space cap check ✅
- Device session revocation UI (`/settings/account`) ✅
- Permanent account purge workflow with confirmation modal ✅

### ✅ Phase 4 — Public Editorial Portal (Complete)
- Curated literature index from Psyche, Aeon, Greater Good, The Marginalian, The School of Life ✅
- Homepage (`/`) with featured inquiries, quote of reflection, topics, publication strips ✅
- Discover catalog (`/discover`) with live search & source filter ✅
- 5 dedicated category hubs (`/psychology`, `/relationships`, `/philosophy`, `/science`, `/literature`) ✅
- Publication directory (`/publications`) and individual profile pages (`/publications/[slug]`) ✅
- Interactive search engine (`/search`) with live term highlighting and suggestions ✅
- Saved bookmarks library (`/saved`) with localStorage persistence ✅
- Reading history log (`/history`) with privacy tracking toggle ✅

### ✅ Phase 5 & 6 & 7 — Private Messaging & Disappearing Engine UI (Complete)
- 1:1 conversation room (`/messages/[spaceId]`) with auto-scroll and reply quoting ✅
- Disappearing timer preset selector (`just_seen`, `1s`, `5m`, `1h`, `24h`) with live badge indicators ✅
- Real-time reaction tray (❤️, 🥰, 🫂, 😂, 🕊️) with optimistic count toggling ✅
- Voice note player and simulated recorder trigger ✅
- In-conversation search and pinned memory strip ✅
- Partner typing indicator with reduced-motion fallback ✅

### ✅ Phase 8 — Games & Question Engine (Complete)
- Games Parlour (`/games`) featuring Couple Trivia, Would-You-Rather, Compatibility, Truth or Dare ✅
- Multi-round interactive session player (`/games/[sessionId]`) with blind-reveal masking ✅
- Question Library (`/questions`) spanning 8 categories with "Draw a Card" random generator ✅
- Direct-to-chat inquiry sharing ✅

### ✅ Phase 9, 10, 11 — Sanctuary Living, Calls & Atmosphere (Complete)
- Sanctuary Dashboard (`/home`) with couple presence & soft mood pulse (anti-conflict de-escalation) ✅
- Video & Voice Calling Room (`/calls`) with WebRTC state indicators, mic/camera controls, PiP preview ✅
- Shared archive (`/memories`) with digital love letters, shared timeline, and strict private journal ✅
- Calendar & Milestones (`/calendar`) with countdown timers and anniversary reminders ✅
- Atmosphere customization (`/settings/appearance`) with 9 palettes, light/dark modes, 6 font pairings, chat bubble styles ✅
- Discretion settings (`/settings/notifications`) with stealth alert masking ✅
- Client cache purge on reconnect

### 📋 Phase 7 — Media Messaging
- Image upload + preview
- Video upload + player
- Voice message recording + VoiceNotePlayer integration
- Signed URL generation (server-side, 1h expiry)

### 📋 Phase 8 — Games & Questions
- Question library seeding (8 categories, ~200 questions)
- Daily question (space-scoped, day-locked)
- Random question generator
- Shared blind-reveal sessions
- Game engine: Couple Trivia, Compatibility, Would-You-Rather, Truth or Dare, Guess Partner
- Custom quiz creation
- Score tracking + game history

### 📋 Phase 9 — Shared Experiences
- Digital letters (draft → schedule → send)
- Shared memories + photo albums
- Memory timeline
- Shared calendar + anniversary reminders
- Bucket lists
- Shared notes
- Private journals (strict `created_by` RLS)

### 📋 Phase 10 — Voice & Video Calls
- LiveKit Cloud setup
- Server-side token minting (space membership verified)
- Incoming call UI (Realtime Broadcast signalling)
- In-call UI (mic, camera, PiP, reconnection)
- Call history

### 📋 Phase 11 — Personalisation Engine
- Preference persistence (Supabase `user_preferences`)
- Theme/palette/font/density settings page
- Load preferences from DB on session start (server-side initial render)
- Real-time preference updates (no page reload)

### 📋 Phase 12 — QA, Polish & Deployment
- 4-persona RLS test suite
- Performance optimisation (ISR, lazy loading, bundle analysis)
- Accessibility audit (WCAG AA)
- Vercel production config + custom domains
- Supabase production config
- LiveKit Cloud production config
- README + deployment guide

---

## Complexity Reference

| Phase | Estimated Complexity | Key Risk |
|---|---|---|
| 2 | Low | Supabase setup requires user action |
| 3 | Medium | Email delivery configuration |
| 4 | Medium | RSS feed rate limits, terms verification |
| 5 | High | Realtime concurrency, offline handling |
| 6 | High | Server-authoritative timing edge cases |
| 7 | Medium | File size limits, mobile browser compatibility |
| 8 | Medium | Blind reveal RLS policy correctness |
| 9 | Low-Medium | Letter scheduling, timezone handling |
| 10 | High | WebRTC/LiveKit, mobile PiP |
| 11 | Low | CSS variable injection already built |
| 12 | Medium | End-to-end testing setup |

