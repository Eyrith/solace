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

### 🔄 Phase 2 — Architecture & Infrastructure (In Progress)
- Architecture documentation ✅
- Database schema documentation ✅
- Security plan ✅
- `.env.example` and project scaffolding
- Supabase project setup (user action required)
- Database migrations
- Middleware host routing
- Supabase client helpers

### 📋 Phase 3 — Authentication & Private Spaces
- Registration + email verification
- Login (editorial-styled, discreet)
- Password reset
- Invitation system (create + consume)
- Space creation
- Space switcher (multiple spaces)
- Session management + revocation UI

### 📋 Phase 4 — Public Editorial Portal
- RSS ingestion Edge Function
- Homepage (featured articles, publication strips)
- Discover page (all articles, filters)
- 5 topic category pages
- Publication directory + individual publication pages
- Search (full-text via Supabase)
- Saved articles (localStorage for guests, DB for authenticated)
- Reading history (opt-in)

### 📋 Phase 5 — Messaging Core
- Real-time 1:1 text chat (Supabase Realtime)
- Reply, edit, soft-delete
- Reactions
- Read receipts (Realtime Broadcast)
- Typing indicators (Realtime Presence)
- Message search
- Pinned messages
- Private media gallery

### 📋 Phase 6 — Disappearing Messages
- Expiry mode selector in composer
- `mark_message_viewed` RPC integration
- Background cleanup Edge Function (pg_cron, 60s interval)
- Media cleanup (Supabase Storage object deletion)
- Cache-Control: no-store on all private responses
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

