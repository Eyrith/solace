# Architecture — Project00

> Last updated: Division 01
> Status: Authoritative design document. Code must conform to this document, not the other way around.

---

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER / CLIENT                         │
│                                                                 │
│  www.example.com ──► Public Editorial Portal (read-only face)  │
│  app.example.com ──► Private Sanctuary (requires login)         │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS
                     ┌─────▼──────┐
                     │   Vercel   │  CDN + Edge Runtime
                     │  Next.js   │  Single codebase, host routing
                     └─────┬──────┘
          ┌────────────────┼────────────────┐
          │                │                │
    ┌─────▼──────┐  ┌──────▼──────┐  ┌─────▼──────┐
    │ Supabase   │  │  LiveKit    │  │  External  │
    │ PostgreSQL │  │  Cloud      │  │  RSS Feeds │
    │ Auth       │  │  (video/    │  │  (Psyche,  │
    │ Storage    │  │   audio)    │  │  Aeon etc.)│
    │ Realtime   │  └─────────────┘  └────────────┘
    │ Edge Fns   │
    └────────────┘
```

**Core principle:** One Next.js codebase, two distinct runtime experiences split by hostname at the middleware layer. No second server. No separate API service. Supabase is the only database/auth/realtime provider.

---

## 2. Host Routing Strategy

### Middleware (`src/middleware.ts`)

The Next.js middleware runs on every request at the edge before any page renders. It inspects `request.headers.get('host')` and rewrites the URL to the appropriate route segment.

```
www.example.com → /public/* routes   (editorial portal)
app.example.com → /app/* routes      (private sanctuary)
localhost:3000  → /public/* by default (dev, see NEXT_PUBLIC_DEFAULT_HOST)
```

**Why not separate deployments?**
- Shared Auth: Supabase session cookies work across both hosts (same first-party API)
- Shared components: `src/components/ui/` primitives used by both sides
- Operational simplicity: one deploy, one environment variable set, one Vercel project

**Security implication:** Middleware must never leak any app-side route, data, or session information when serving a www-host request. This is enforced by route segment separation and RLS policies on the backend — the middleware is a routing convenience, not a security boundary.

### Route Segment Map

```
src/app/
├── (public)/              ← All www.example.com routes
│   ├── layout.tsx         ← PublicShell (editorial header + footer)
│   ├── page.tsx           ← Homepage
│   ├── discover/
│   ├── psychology/
│   ├── relationships/
│   ├── philosophy/
│   ├── science/
│   ├── literature/
│   ├── publications/
│   │   └── [slug]/
│   ├── saved/
│   ├── history/
│   ├── search/
│   └── auth/
│       ├── login/
│       └── register/
│
├── (app)/                 ← All app.example.com routes
│   ├── layout.tsx         ← PrivateShell (sidebar + bottom nav)
│   ├── page.tsx           ← Dashboard / Home
│   ├── messages/
│   │   └── [spaceId]/
│   ├── games/
│   │   └── [sessionId]/
│   ├── questions/
│   ├── memories/
│   ├── calendar/
│   ├── calls/
│   ├── settings/
│   │   ├── appearance/
│   │   ├── notifications/
│   │   └── account/
│   └── invite/
│       └── [token]/
│
├── api/                   ← Next.js Route Handlers (server-side only)
│   ├── auth/
│   │   └── callback/      ← Supabase OAuth callback
│   ├── livekit/
│   │   └── token/         ← LiveKit JWT minting (private endpoint)
│   ├── feeds/
│   │   └── sync/          ← RSS ingestion trigger
│   └── webhooks/
│       └── supabase/      ← Supabase webhook receiver
│
├── design-system/         ← DEV ONLY workbench (strip in prod)
└── preview/               ← DEV ONLY previews (strip in prod)
```

---

## 3. Component Architecture

### Layering Rules (strict)

```
src/
├── lib/                   ← Pure utilities, no React, no side effects
│   ├── utils.ts           ← cn(), formatDuration(), etc.
│   ├── design-system/     ← Token types and font loaders
│   ├── supabase/          ← Supabase client factories (server + browser)
│   ├── livekit/           ← Token signing helpers
│   ├── feeds/             ← RSS parser utilities
│   └── validations/       ← Zod schemas for all forms and API payloads
│
├── components/
│   ├── ui/                ← Primitive, context-free UI atoms
│   │   └── (button, input, card, dialog, toast, etc.)
│   ├── providers/         ← Context providers (DesignSystem, Auth, etc.)
│   ├── editorial/         ← Public portal composite components
│   │   └── (PublicShell, ArticleCard, PublicationCard, SearchBar, etc.)
│   └── sanctuary/         ← Private app composite components
│       └── (PrivateShell, ChatBubble, ChatComposer, VoiceNotePlayer, etc.)
│
└── app/                   ← Next.js App Router pages + route handlers
    └── (page and layout files only — no business logic here)
```

**Rules:**
1. `lib/` has zero React imports. Pure TypeScript.
2. `components/ui/` has zero Supabase/LiveKit imports. Data-free atoms.
3. `components/editorial/` and `components/sanctuary/` may use React hooks and fetch data via server components or React Query.
4. Pages (`app/`) orchestrate layouts and pass server-fetched data to components. No inline SQL or fetch logic inside JSX.

---

## 4. Data Flow

### Public Portal (www)

```
Request → Edge Middleware → (public) layout
       → Server Component (RSC) fetches articles from Supabase
       → Renders ArticleCard list → HTML streamed to client
       → Client: bookmark toggle saved to localStorage (unauthenticated)
       →         or Supabase saved_articles (authenticated)
```

**ISR (Incremental Static Regeneration):**
- Article list pages: `revalidate = 3600` (1-hour cache)
- Publication pages: `revalidate = 86400` (24-hour cache)
- Reading history / saved: `no-store` (personal, never cached)

### Private App (app)

```
Request → Edge Middleware → Auth check (Supabase session cookie)
       → If no session → redirect to /auth/login
       → PrivateShell renders with space context
       → RSC fetches messages (paginated, 50 at a time)
       → Client subscribes to Supabase Realtime for new messages
       → Realtime Presence for typing indicators
       → Realtime Broadcast for read receipts
```

### Disappearing Messages (server-authoritative)

```
Sender → POST /api/messages (server action or route handler)
       → Insert into messages table with expires_mode + expires_at
       → Message delivered via Realtime subscription

Recipient opens message
       → Client calls mark_as_viewed RPC (Postgres function)
       → RPC sets viewed_at = now() on message_receipts
       → If mode is 'just_seen' → computes expires_at = now()
       → If mode is '1_second'  → computes expires_at = now() + 1s
       → etc.

Background cleanup (Supabase Edge Function scheduled via pg_cron)
       → Every 60 seconds: DELETE from messages WHERE expires_at < now()
       → Deletes associated storage objects for media messages
       → Cascades to message_receipts, message_reactions, message_attachments

Client reconnects after offline
       → Fetches messages with server timestamp
       → Expired messages are simply absent from results (server enforced)
       → No client-side timer, no frontend expiry trick
```

---

## 5. Authentication Architecture

### Session Model

Supabase Auth provides JWTs. The Next.js middleware validates the session cookie using `@supabase/ssr` before serving any `(app)/` route.

```
Register → Supabase Auth (email + password) → email verification
Login    → Supabase issues access_token + refresh_token
         → Stored as HttpOnly cookies via @supabase/ssr (not localStorage)
         → Access token lifetime: 1 hour
         → Refresh token: 30-day rolling window

Logout   → Server action clears cookies, calls supabase.auth.signOut()
         → Invalidates refresh token at Supabase

Session revocation → Admin can call auth.admin.signOut(userId, 'global')
                   → All devices signed out within token lifetime (max 1 hour)
```

### Private Space Membership

```sql
-- A user can only access a space if they are in private_space_members
-- Enforced by RLS policies on every private table
-- Max 2 members per space (enforced by CHECK constraint + before-insert trigger)

private_spaces          (space_id, name, created_by, created_at)
private_space_members   (space_id, user_id, joined_at, role)
                        -- role: 'owner' | 'member'
```

### Invitation Flow

```
Owner creates invitation
→ INSERT into invitations (space_id, token, expires_at, max_uses=1)
→ Shareable link: app.example.com/invite/[token]

Invitee clicks link
→ Middleware: if no session → redirect to /auth/register?next=/invite/[token]
→ After registration/login → consume_invitation RPC
→ RPC: validates token, checks expiry, checks space member count < 2
→ Inserts into private_space_members
→ Token marked used (deleted or used_at set)
→ Redirect to space messages
```

---

## 6. Security Architecture

### Supabase Row Level Security — Principles

Every private table has RLS enabled. The fundamental pattern:

```sql
-- User can only read their own space's data
CREATE POLICY "space_member_read" ON messages
  FOR SELECT
  USING (
    space_id IN (
      SELECT space_id FROM private_space_members
      WHERE user_id = auth.uid()
    )
  );
```

**Zero trust defaults:**
- `ENABLE ROW LEVEL SECURITY` on every table before any policy
- Default deny all — only explicitly granted operations are allowed
- Service-role key NEVER exposed to client (server-side route handlers only)
- Anon key used only for public, unauthenticated reads (editorial articles, publications)

### Private Media

```
Upload → Supabase Storage bucket: 'sanctuary-media' (private bucket)
       → Path: {space_id}/{message_id}/{filename}
       → RLS policy: only space members can read

Download → Server-side signed URL (expires in 1 hour)
         → Never expose permanent public URLs
         → For disappearing media: URL is not issued after expires_at passes
         → Cache-Control: no-store on all private media responses
```

### What We Do NOT Implement

| Threat | Decision | Rationale |
|---|---|---|
| Screenshot prevention | ❌ Not implemented | OS-level feature, cannot prevent |
| End-to-end encryption | ❌ Not in MVP | Adds key management complexity; RLS provides sufficient isolation for stated use case; can be added later using Signal Protocol via libsodium |
| Custom crypto | ❌ Never | Use Supabase's built-in encryption at rest |
| Content scraping | ❌ Not implemented | RSS metadata only; outbound links to publishers |

---

## 7. External Integrations

### RSS Feed Sources

| Publication | Feed URL | Licence / Terms |
|---|---|---|
| Psyche | `https://psyche.co/feed` | CC Attribution (verify on use) |
| Aeon | `https://aeon.co/feed.rss` | Verify before use |
| Greater Good Magazine | `https://greatergood.berkeley.edu/feeds/articles` | Verify before use |
| The Marginalian | `https://www.themarginalian.org/feed/` | Verify before use |
| The School of Life | Manual curation (no public RSS) | Outbound links only |

**What we ingest:** Title, author, description/excerpt (≤300 chars), publication date, original URL, estimated reading time (derived from word count in feed), categories/tags.

**What we never store:** Full article body, images beyond Open Graph thumbnails, any content not explicitly in the feed.

### LiveKit Cloud

- Server-side token minting only (`src/app/api/livekit/token/route.ts`)
- Token claims: `room = space_id`, `identity = user_id`
- Room created on-demand when first participant joins
- Room auto-deletes after all participants leave
- Webhook: `participant_joined`, `participant_left`, `room_ended` → update call_sessions table

### Supabase Edge Functions

| Function | Trigger | Purpose |
|---|---|---|
| `sync-feeds` | pg_cron every 2h | Fetch and upsert RSS items |
| `cleanup-expired-messages` | pg_cron every 60s | Hard-delete expired messages + media |
| `send-anniversary-reminders` | pg_cron daily at 08:00 | Email reminders for calendar events |
| `livekit-webhook` | HTTP POST from LiveKit | Update call_sessions table |

---

## 8. Environment Variables

All variables documented in `.env.example`. Categorised:

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=         # Server-side only. Never expose.

# LiveKit
LIVEKIT_API_KEY=                   # Server-side only
LIVEKIT_API_SECRET=                # Server-side only
NEXT_PUBLIC_LIVEKIT_URL=           # wss://your-project.livekit.cloud

# App
NEXT_PUBLIC_APP_URL=               # https://app.example.com
NEXT_PUBLIC_PUBLIC_URL=            # https://www.example.com
NEXT_PUBLIC_DEFAULT_HOST=          # 'public' | 'app' (dev routing)
```

---

## 9. Performance Budget

| Metric | Target | Strategy |
|---|---|---|
| Public portal LCP | < 1.5s | ISR, image optimization, CDN |
| Private app TTI | < 2.5s | Code splitting by route |
| Message latency | < 200ms | Supabase Realtime WebSocket |
| Video call setup | < 3s | LiveKit Cloud edge nodes |
| Bundle size (initial JS) | < 150KB gzipped | Dynamic imports for heavy features |

---

## 10. Deployment Architecture

```
Vercel Project: project00
├── Production branch: main
├── Preview branches: feature/* and fix/*
├── Environment Variables: set in Vercel dashboard (not committed)
└── Domains:
    ├── www.example.com   → Vercel edge
    └── app.example.com   → Vercel edge

Supabase Project: project00-prod
├── Region: (choose closest to user, e.g. ap-south-1 for India)
├── Database: PostgreSQL 15
├── Auth: Email/password enabled, magic link disabled
├── Storage: sanctuary-media (private), editorial-og-images (public)
└── Edge Functions: deployed via supabase CLI

LiveKit Cloud Project: project00
└── Region: (closest to users)
```

---

## 11. Development Workflow

```
1. Create feature branch: git checkout -b feature/div-03-database
2. Write migration file in supabase/migrations/
3. Apply locally: supabase db push (or supabase migration up)
4. Write corresponding TypeScript types in src/lib/supabase/types.ts
5. Implement feature in components/pages
6. Run: npm run typecheck && npm run lint && npm run build
7. Commit: git add -A && git commit -m "feat(div-03): add messages table + RLS"
8. Open PR → Vercel preview deployment auto-generated
9. Test on preview URL
10. Merge to main → Production deployment
```

---

*This document is Division 01 output. See also: `database-schema.md`, `security-plan.md`, `api-specification.md`*

