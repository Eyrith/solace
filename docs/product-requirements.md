# Product Requirements Document (PRD)

**Document Status:** Draft v0.1 (Division 00 — Product Discovery)  
**Target Product:** Dual-Experience Editorial Discovery Portal & Private Communication Platform  
**Last Updated:** 2026-11-11

---

## 1. Executive Summary & Product Vision

This product is a single cohesive platform combining **two strictly separated user experiences** built on shared infrastructure:

1. **Experience A — Public Editorial Discovery Portal (`www.example.com`)**:  
   An intellectual, typography-led public reading portal curating external essays and articles from established publications (*Psyche*, *Aeon*, *Greater Good Magazine*, *The Marginalian*, *The School of Life*) across Psychology, Science, Philosophy, Relationships, and Literature. It must deliver full discovery value without requiring an account, maintain a discreet and neutral public appearance, and rigorously respect publisher copyright and attribution rules.

2. **Experience B — Private Communication & Shared-Experience Application (`app.example.com`)**:  
   An intimate, calm, personal, and highly customisable sanctuary for two-person private spaces ("couples/partners" without assuming any specific relationship arrangement). It integrates real-time private messaging, server-enforced disappearing messages, interactive games and question libraries, 1:1 LiveKit voice/video calling, shared keepsakes (letters, memories, photos, calendar, bucket lists, shared notes), strictly isolated personal journals/private notes, and granular visual personalisation.

---

## 2. Dual-Experience Architecture Principles (Product Perspective)

| Dimension | Experience A: Public Portal (`www`) | Experience B: Private Application (`app`) |
| :--- | :--- | :--- |
| **Primary Tone** | Editorial, intellectual, minimal, magazine-like | Personal, calm, intimate, relaxing, bespoke |
| **Authentication** | Optional (required only for cross-device sync / space entry) | Mandatory for every route and API |
| **Navigation & Layout** | Public top/editorial nav, topic bars, directory | Private space switcher, conversation/activity workspace |
| **Public Indexing** | SEO-indexed (`index, follow`) for public catalog pages | Strictly non-indexed (`noindex, nofollow`), zero public leaks |
| **Discretion** | Looks purely like an editorial reading platform; zero mention of private relationship features on landing pages | Accessible only after sign-in and private-space membership check |
| **Data Isolation** | Public catalog readable by all; saved/history scoped to user (or browser locally) | Strict 2-member per-space Row Level Security (RLS); personal journals scoped to single author |

---

## 3. Target User Personas

1. **Unauthenticated Public Reader (Visitor):** Arrives via search or direct link to discover essays, filter by topic/publication, save articles locally, and optionally track reading history in-browser without creating an account.
2. **Registered Reader:** Signs up primarily to sync saved articles and opt-in reading history across devices. May never open a private space.
3. **Private Space Initiator (User A):** Creates an account, opens a private two-person space, generates an explicit partner invitation, and configures the space.
4. **Invited Partner (User B):** Accepts an explicit invitation, verifies identity, and collaborates inside the shared 2-person space across messaging, games, calls, and shared memories.
5. **Multi-Space Account Holder:** An account invited into more than one independent private space (e.g., separate personal relationships or testing/archival spaces). Each space's data, media, themes/conversations, and permissions remain 100% isolated from other spaces.
6. **Editorial Curator / Platform Operator (Internal):** Manages source feeds, verifies licensing/RSS compliance, curates collections, and populates metadata where external feeds are incomplete.

---

## 4. Functional Requirements

> **Legend:**  
> - **Priority:** `MVP` (Essential launch core), `V1` (Core brief requirement sequenced right after MVP), `V2` (Deferred enhancement)  
> - **Decision Status:** `Specified` (in Master Prompt) | `Pending Approval` (flagged in Discovery Questions)

### 4.1 Experience A — Public Editorial Discovery Portal

| ID | Requirement | Priority | Status | Notes / Constraints |
| :--- | :--- | :--- | :--- | :--- |
| FR-PUB-01 | Provide Homepage, Discover, 5 Topic pages (Psychology, Relationships, Philosophy, Science, Literature), Publication Directory, Individual Publication pages, Saved Articles, Reading History, Search & Filters, and Login/Registration. | MVP | Specified | All 13 required routes must be responsive and navigable without auth (except account-sync login/register). |
| FR-PUB-02 | Curate articles from *Psyche*, *Aeon*, *Greater Good Magazine*, *The Marginalian*, and *The School of Life* via verified RSS feeds, official APIs, or manual curation. | MVP | Pending Approval | Must audit each publisher's RSS availability and Terms of Service before automating ingestion. |
| FR-PUB-03 | Display Title, Author, Publication, Publication Date, Short Description, Original URL, Category, and Reading Duration (when available). | MVP | Specified | Missing publisher fields (e.g., reading duration) must gracefully omit or accept manual curator entry—never fabricate. |
| FR-PUB-04 | Strictly enforce copyright compliance: no full-article scraping, no copyrighted illustrations or copied publication branding/layouts, clear attribution, outbound links to original publishers. | MVP | Specified | Hard legal/ethical constraint. |
| FR-PUB-05 | Support Saved Articles (bookmarks) and opt-in Reading History for visitors (browser-local) and signed-in users (server-synced). | MVP / V1 | Pending Approval | Needs decision on whether anonymous visitors get local persistence or account-only persistence (Q1). |
| FR-PUB-06 | Provide keyword search and multi-facet filters (category, publication, reading duration, publication date) plus curated editorial collections. | MVP | Specified | Collections require curator schema support. |
| FR-PUB-07 | Keep public branding and navigation discreet—never advertise or expose private communication/relationship functionality to unauthenticated visitors. | MVP | Specified | Zero cross-leakage of private terminology or APIs. |

### 4.2 Authentication, Accounts & Private Spaces

| ID | Requirement | Priority | Status | Notes / Constraints |
| :--- | :--- | :--- | :--- | :--- |
| FR-AUTH-01 | Support registration, login, email verification, password recovery, logout, session listing, and individual/all-session revocation. | MVP | Pending Approval | Needs decision on auth methods beyond email/password (e.g., Magic Links vs. OAuth) (Q4). |
| FR-AUTH-02 | Enforce explicit partner invitations to join a private space; verify invitation token/recipient and strictly cap each couple space at 2 active authorised participants. | MVP | Pending Approval | Needs decision on email-locked vs. shareable expiring link vs. both (Q5). |
| FR-AUTH-03 | Support one account belonging to multiple independent private spaces with an explicit space switcher and strict cross-space data isolation. | MVP | Specified | Must verify zero cross-space queries or Realtime subscriptions leak across active spaces. |
| FR-AUTH-04 | Provide clear account deletion and space-departure flows, defining what happens to shared messages, media, and personal journals. | MVP | Pending Approval | Missing requirement identified in Section 6 (Q11). |
| FR-AUTH-05 | Implement rate limiting, abuse prevention, input validation, and security event logging (logins, failed auth, invites, revocations, deletions). | MVP | Specified | Service-role secrets must never reach client bundles. |

### 4.3 Experience B — Private Messaging & Disappearing Messages

| ID | Requirement | Priority | Status | Notes / Constraints |
| :--- | :--- | :--- | :--- | :--- |
| FR-MSG-01 | Real-time 1:1 text messaging inside a private space with replies, reactions, editing, deletion, read receipts, typing indicators, message search, and message pinning. | MVP | Pending Approval | Needs clarity on "delete for everyone" vs "delete for me" and edit history behavior (Q7). |
| FR-MSG-02 | Support image sharing, video sharing, voice message recording/upload with custom playback controls, and a searchable/browsable Private Media Gallery. | V1 | Specified | Private storage buckets with short-lived signed URLs; file size/type limits required. |
| FR-DISP-01 | Support 6 disappearing expiration modes: `Just seen`, `1s after viewing`, `5m after viewing`, `1h after viewing`, `24h`, and `Custom duration`. | V1 | Pending Approval | Needs clarity on whether `24h` and `Custom` count from send or view, and how "Just seen" behaves on screen/leave (Q6). |
| FR-DISP-02 | Enforce expiration strictly server-side using authoritative database timestamps (`viewed_at`, `expires_at`), preventing retrieval of expired items via ordinary APIs/RLS. | V1 | Specified | Frontend timers are purely cosmetic; server rejects/filters expired rows. |
| FR-DISP-03 | Handle offline recipients and reconnecting devices cleanly, purging locally cached/in-memory expired payloads upon reconnection and running reliable background cleanup for rows and media objects. | V1 | Specified | Must also disclose cache/backup retention limits and impossibility of screenshot prevention. |

### 4.4 Experience B — Games & Quizzes

| ID | Requirement | Priority | Status | Notes / Constraints |
| :--- | :--- | :--- | :--- | :--- |
| FR-GAME-01 | Provide a dedicated Games hub covering 9 categories: Couple trivia, Compatibility quizzes, Would-you-rather, Guess your partner's answer, Truth or dare, Custom quizzes, Personality quizzes, Memory games, Intellectual challenges. | V1 | Pending Approval | Launching all 9 engines/content packs simultaneously is high effort; needs phased rollout confirmation (Q8). |
| FR-GAME-02 | Support 2-player sessions with independent blind answers, synchronized/simultaneous answer reveal, score tracking, game history, saved favourites, and custom game creation. | V1 | Specified | Server must withhold partner's answer row/column via RLS or RPC until both submit (anti-peeking). |

### 4.5 Experience B — Question Library

| ID | Requirement | Priority | Status | Notes / Constraints |
| :--- | :--- | :--- | :--- | :--- |
| FR-QUES-01 | Provide an extensive categorised Question Library across 8 categories: Funny, Romantic, Personal, Childhood memories, Intellectual, Hypothetical situations, Future aspirations, Intimacy and preferences. | V1 | Pending Approval | Needs content sourcing/seeding strategy (editorial seed bank vs AI-assisted curation vs user-added) (Q8). |
| FR-QUES-02 | Support Daily Question, Random Question Generator, Saved Questions, Custom Collections, and Shared Question Sessions with optional hidden answers until both participants respond. | V1 | Specified | Shared reveal logic can reuse the blind-answer reveal pattern from Games. |

### 4.6 Experience B — Voice & Video Calling

| ID | Requirement | Priority | Status | Notes / Constraints |
| :--- | :--- | :--- | :--- | :--- |
| FR-CALL-01 | Integrate LiveKit Cloud for 1:1 voice and video calls with mic/camera controls, device permission handling, Picture-in-Picture where supported, connection states, network reconnection, and call history. | V1 | Pending Approval | Needs clarity on incoming call ringing when recipient's browser/PWA is backgrounded vs open in-app (Q9). |
| FR-CALL-02 | Issue scoped LiveKit room access tokens server-side strictly to verified members of the target 2-person space. | V1 | Specified | Never mint tokens client-side or expose LiveKit API secrets. |

### 4.7 Experience B — Shared Experiences & Private Journals

| ID | Requirement | Priority | Status | Notes / Constraints |
| :--- | :--- | :--- | :--- | :--- |
| FR-SHRD-01 | Provide Digital Letters, Shared Memories, Shared Photo Collections (albums), Important Dates, Shared Calendar, Bucket Lists, Shared Notes, Memory Timeline, and Anniversary Reminders. | V1 | Pending Approval | Needs clarity on note collaboration (last-write-wins vs real-time CRDT) and email vs in-app reminders (Q10). |
| FR-SHRD-02 | Enforce strict isolation for Personal Journals and Private Notes: completely inaccessible to the partner (and excluded from shared feeds/queries) unless explicitly shared by the author. | V1 | Specified | Mandatory RLS separation (`owner_id = auth.uid()` unless `is_shared = true`). |

### 4.8 Experience B — Personalisation

| ID | Requirement | Priority | Status | Notes / Constraints |
| :--- | :--- | :--- | :--- | :--- |
| FR-PERS-01 | Support customising themes, light/dark modes, font families (from curated editorial/sans pairings), font sizes, chat bubble styles, chat backgrounds, colour palettes, animation preferences (including reduced motion), notification preferences, and interface density. | V1 | Pending Approval | Needs decision on whether visual themes apply per-user or per-space (Q12). |

---

## 5. Non-Functional Requirements

1. **Security & Privacy:**
   - All private tables protected by PostgreSQL Row Level Security (RLS) verified against 4 test personas: User A, User B, Unauthenticated Visitor, Unauthorised Third-Party Account.
   - No custom cryptography. Baseline encryption uses TLS in transit, provider encryption at rest, and strict server-side authorization; optional E2EE must be explicitly evaluated before committing (Q3).
   - Private media stored in non-public buckets accessed exclusively via short-lived signed URLs; upload MIME/magic-byte validation and size caps enforced.
   - Rate limiting on auth, invites, messaging bursts, media uploads, and LiveKit token generation.
2. **Performance & Real-Time Reliability:**
   - Public pages leverage Static Site Generation (SSG) / Incremental Static Regeneration (ISR) for fast editorial loads and clean SEO.
   - Private real-time messaging delivers sub-second updates while both users are active and reconciles missed events seamlessly after offline/network drops.
   - Mobile-first responsiveness with smooth, restrained Framer Motion animations honoring `prefers-reduced-motion`.
3. **Accessibility:**
   - WCAG 2.1 AA colour contrast across every curated palette and light/dark mode combination.
   - Full keyboard navigation, semantic landmarks, screen-reader labels for icon controls, focus rings, and accessible form error messaging.
4. **Data Retention & Backup Honesty:**
   - Explicitly document in privacy/security docs that database point-in-time recovery (PITR) backups in managed PostgreSQL retain deleted/expired snapshots until backup retention windows roll over, and client screenshots/screen recordings cannot be technically blocked on web browsers.

---

## 6. Missing Requirements & Ambiguities Identified

During product discovery, the following gaps were identified in the original brief and must be resolved before database schema and API design begin:

1. **Unauthenticated Bookmarks & History Persistence:** Does an unauthenticated visitor save articles/history in browser `localStorage`, or require a free account?
2. **Editorial Content Operations:** Automated RSS feeds vary across the 5 publications (some omit full summaries, authors, or reading durations; some limit RSS items to recent posts). How should missing metadata and historical curation be handled?
3. **Privacy / Encryption Model (Server-Enforced RLS vs. True Client-Side E2EE):** True E2EE breaks server-side message search, multi-device seamless history without key recovery UX, and automated server cleanup rules unless carefully architected. Baseline vs. E2EE needs an explicit choice.
4. **Auth Methods & Signup Gating:** Email+Password only, Magic Links, or Social OAuth? Can anyone create a private space immediately, or is space creation gated during early launch?
5. **Invitation Mechanics:** Email-restricted invitations, shareable expiring links/codes, or both?
6. **Disappearing Message Edge Semantics:**
   - Does `"Just seen"` disappear immediately upon leaving the chat / closing the viewport / `N` seconds after read receipt?
   - Do `"24 hours"` and `"Custom"` expire relative to *sent time* or *first viewed time*?
   - Can disappearing messages be replied to, pinned, or saved to Memories, or must those actions be blocked to prevent retention leaks?
   - What happens when a user edits or deletes an existing message? (Soft tombstone `"Message deleted"` vs silent disappearance; edit indicator vs edit history).
7. **Message Search Scope:** Full-text PostgreSQL search over non-expired text messages only, or also captions/media titles?
8. **Games & Questions Content & Scope:** All 9 game types include vastly different mechanics (e.g., *Memory games* is visual card-matching state, *Compatibility quizzes* needs scoring formulas, *Truth or dare* is prompt-based). Which games launch in MVP/V1 vs. phased rollouts? Who authors the initial question/game bank?
9. **Incoming Call Ringing Outside Active Tab:** Web apps cannot wake a closed iOS/Android browser reliably without native apps or Web Push + Service Workers. Is in-app live ringing + optional Web Push sufficient for V1?
10. **Shared Notes Concurrency & Reminders:** Is last-write-wins or single-editor lock acceptable for shared notes initially, vs. complex CRDT live multi-cursor editing? Are anniversary reminders email, in-app, or Web Push?
11. **Account Deletion & Space Dissolution Semantics:** If User A deletes their account or leaves a shared space, what happens to User B's shared memories, letters, photos, and messages?
12. **Personalisation Scope (User vs. Space):** Do themes/backgrounds apply per-user (User A prefers Charcoal/Lora, User B prefers Warm Ivory/Cormorant) or shared across the space?
13. **Domain & Deployment Reality:** Will `www.` and `app.` be served by one Next.js codebase using host-based middleware routing (simplest, low cost) or two separate Vercel deployments?
14. **Budget & Operational Limits:** Target monthly hosting budget (free tiers during build vs. Pro tiers for production reliability/PITR backups/LiveKit usage).

---

## 7. Technical & Product Risks

| Risk ID | Risk Description | Severity | Likelihood | Mitigation Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **RSK-01** | **Copyright / Publisher ToS Violation:** Scraping full text, hotlinking copyrighted illustrations, or copying publication layouts risks takedowns or legal liability. | High | Medium | Store only permitted metadata + short RSS excerpt/curator summary + canonical outbound link; self-host neutral typography/iconography; audit all 5 publishers' RSS/terms before launch. |
| **RSK-02** | **Disappearing Message Leaks via Cache/Realtime/Offline Reconnect:** Expired payloads remain visible in React state, IndexedDB, browser HTTP cache, or CDN storage URLs after expiration. | High | High | Use `Cache-Control: no-store` on private API/media responses, short-lived signed URLs, purge client query/Realtime caches on expiry & focus/reconnect, and filter expired rows strictly in SQL/RLS. |
| **RSK-03** | **Cross-Space or Cross-User Data Exposure (RLS Bug):** Misconfigured Supabase policy or Realtime channel leaks messages, journals, or media to another user or public endpoint. | Critical | Medium | Enforce deny-by-default RLS on every private table + storage bucket; write automated 4-persona authorization tests (User A, User B, Anon, Outsider) before shipping any private feature. |
| **RSK-04** | **Scope Explosion Across 9 Modules:** Attempting to build a full editorial CMS, full WhatsApp-clone messaging, 9 custom game engines, video calling, and shared suite simultaneously delays launch indefinitely. | High | High | Enforce strict MVP vs. V1 phased milestones (`docs/mvp-scope.md`), reusable components (e.g., one blind-answer reveal engine shared by Question Sessions and Quizzes), and iterative shippable slices. |
| **RSK-05** | **Missed Incoming Calls When App Is Closed:** Browser tabs closed/sleeping on mobile OSes do not receive WebSocket ring events. | Medium | High | Design clear UX expectations (in-app ringing + optional Web Push notification + missed-call log + "Call requested" message card in chat). |
| **RSK-06** | **LiveKit & Media Storage Cost Overruns:** Unbounded video uploads or multi-hour HD calls blow through free/low-cost bandwidth and storage tiers. | Medium | Medium | Enforce strict upload size/duration caps, client-side image compression/validation, call duration/participant limits (strictly 2), and usage alerts. |
| **RSK-07** | **Blind-Answer Cheating in Games/Questions:** Sending partner's answer in the API payload before both submit exposes it in browser DevTools. | Medium | Medium | Enforce answer secrecy in PostgreSQL RLS / RPCs so partner answers are unreadable until `both_answered = true`. |

