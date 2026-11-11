# Feature Inventory & Acceptance Criteria

**Document Status:** Draft v0.1 (Division 00 — Product Discovery)  
**Scope:** Complete catalog of Experience A (Public Portal), Experience B (Private Application), and Shared Infrastructure.

---

## 1. Feature Summary Matrix

| Domain | Prefix | Feature Count | Target Tiers |
| :--- | :--- | :--- | :--- |
| Public Editorial Portal | `PUB` | 10 | MVP / V1 |
| Authentication, Spaces & Security | `AUTH` | 8 | MVP |
| Private Messaging | `MSG` | 9 | MVP / V1 |
| Disappearing Messages | `DISP` | 5 | V1 (Phase 5) |
| Games & Quizzes | `GAME` | 5 | V1 / V2 |
| Question Library | `QUES` | 4 | V1 (Phase 6) |
| Voice & Video Calling (LiveKit) | `CALL` | 5 | V1 (Phase 8) |
| Shared Experiences & Private Journals | `SHRD` | 7 | V1 (Phase 7) |
| Personalisation & Accessibility | `PERS` | 4 | V1 (Phase 9) |
| **Total** | | **57** | |

---

## 2. Experience A — Public Editorial Discovery Portal (`PUB`)

### `PUB-01` — Public Homepage
- **Environment:** Public (`www`)
- **Purpose:** Serve as a calm, intellectual, typography-first editorial front page showcasing featured curated essays, active themes, and publication highlights without requiring login.
- **Target Tier:** MVP (Phase 1 & 2)
- **Dependencies:** `PUB-07` (curated articles seeded)
- **Acceptance Criteria:**
  - Given an unauthenticated visitor opens `/`, when the page renders, then featured essays, category entry points, curated collections, and publication highlights load with full attribution and zero private-app UI elements.
  - Given mobile (`375px`) and desktop (`1280px+`) viewports, no horizontal overflow occurs and WCAG AA contrast passes across all text.

### `PUB-02` — Discover Feed & Curated Collections
- **Environment:** Public (`www`)
- **Purpose:** Help readers explore thematic curated collections (e.g., *On Solitude and Attention*, *Foundations of Empathy*) and recent additions across publications.
- **Target Tier:** MVP (Phase 2)
- **Dependencies:** `PUB-07`
- **Acceptance Criteria:**
  - Given a visitor visits `/discover`, when browsing curated collections or recent essays, each card shows title, author (if available), publication name, publication date, category, short description, reading duration (if available), and external link indicator.
  - Given a collection is opened, only published curated articles belonging to that collection appear in curated order.

### `PUB-03` — Topic Category Pages
- **Environment:** Public (`www`)
- **Purpose:** Provide dedicated reading rooms for the five core disciplines: **Psychology**, **Relationships**, **Philosophy**, **Science**, and **Literature**.
- **Target Tier:** MVP (Phase 2)
- **Dependencies:** `PUB-07`
- **Acceptance Criteria:**
  - Dedicated routes exist for `/psychology`, `/relationships`, `/philosophy`, `/science`, and `/literature`.
  - Each page displays only articles tagged with that category, supports sorting/filtering, and presents empty states cleanly if a filter returns zero matches.

### `PUB-04` — Publication Directory & Individual Publication Pages
- **Environment:** Public (`www`)
- **Purpose:** Allow readers to browse established partner/curated publications (*Psyche*, *Aeon*, *Greater Good Magazine*, *The Marginalian*, *The School of Life*) and explore articles grouped by publisher with transparent attribution.
- **Target Tier:** MVP (Phase 2)
- **Dependencies:** `PUB-07`
- **Acceptance Criteria:**
  - `/publications` lists all active curated publications with concise neutral descriptions, editorial focus, and links to their official websites.
  - `/publications/[slug]` lists curated essays strictly from that publication, clearly stating external ownership and linking to the original source.

### `PUB-05` — Search & Multi-Facet Filters
- **Environment:** Public (`www`)
- **Purpose:** Enable rapid discovery of essays by keyword, category, publication, reading duration range, and publication date.
- **Target Tier:** MVP (Phase 2)
- **Dependencies:** `PUB-07`
- **Acceptance Criteria:**
  - Entering a query searches across article title, author, and short description.
  - Filters for Category, Publication, Reading Duration, and Date combine via URL query parameters so filtered results are shareable and bookmarkable.
  - Searching with invalid or special characters never causes SQL/runtime errors and displays an accessible empty state when no results match.

### `PUB-06` — Outbound Attribution & External Article Links
- **Environment:** Public (`www`)
- **Purpose:** Respect publisher copyright by sending readers directly to the original publisher's article URL rather than copying or embedding full article text.
- **Target Tier:** MVP (Phase 2)
- **Dependencies:** `PUB-07`
- **Acceptance Criteria:**
  - Every article action opens the canonical `original_url` safely (`rel="noopener noreferrer"`, target behavior clearly indicated).
  - Full copyrighted article bodies and copyrighted publisher illustrations are never stored or rendered on the platform.
  - If an article click occurs while opt-in Reading History (`PUB-09`) is enabled, the visit is recorded before/during navigation.

### `PUB-07` — Editorial Content Ingestion & Curation Pipeline
- **Environment:** Shared / Internal Admin
- **Purpose:** Populate and maintain accurate article metadata from verified official RSS feeds, official APIs, or manual curation while respecting publisher terms.
- **Target Tier:** MVP (Phase 2)
- **Dependencies:** Database catalog tables (`editorial_sources`, `editorial_articles`, `collections`)
- **Acceptance Criteria:**
  - Ingestion script/job parses validated RSS/metadata feeds without duplicating existing `original_url` entries (idempotent upsert).
  - Missing fields (e.g., missing reading duration or author) remain `NULL` or await curator override rather than displaying fabricated values.
  - **Open Ambiguity (Q2):** Confirm RSS-assist + manual curation workflow vs. purely manual curation.

### `PUB-08` — Saved Articles (Bookmarks)
- **Environment:** Public (`www`)
- **Purpose:** Let readers save essays to revisit later.
- **Target Tier:** MVP (Phase 2)
- **Dependencies:** `PUB-07`; optional `AUTH-01` for cross-device sync
- **Acceptance Criteria:**
  - `/saved` displays saved articles in reverse chronological order with instant unsave capability.
  - Authenticated readers sync saved articles to PostgreSQL (`saved_articles` scoped by `user_id` RLS).
  - **Open Ambiguity (Q1):** Confirm whether unauthenticated visitors store bookmarks in browser `localStorage` (with optional merge on login) or require registration.

### `PUB-09` — Opt-In Reading History
- **Environment:** Public (`www`)
- **Purpose:** Give readers an explicit, privacy-respecting log of articles they clicked/read *only if they choose to turn it on*.
- **Target Tier:** V1 (Phase 2)
- **Dependencies:** `PUB-06`, `PUB-08`
- **Acceptance Criteria:**
  - Reading history defaults to **OFF** until the user explicitly enables it.
  - `/history` allows viewing, pausing/disabling, deleting individual items, and clearing all reading history with one confirmation action.
  - No reading history is logged when the toggle is OFF.

### `PUB-10` — Public Login & Registration Entry Point
- **Environment:** Public (`www`) -> Shared Auth
- **Purpose:** Provide clean, discreet Sign In and Create Account routes (`/login`, `/register`) matching the editorial aesthetic without exposing private relationship branding.
- **Target Tier:** MVP (Phase 2/3)
- **Dependencies:** `AUTH-01`
- **Acceptance Criteria:**
  - `/login` and `/register` pages contain zero references to couples messaging, disappearing chats, or private spaces.
  - Authenticated users can manage reading account preferences or transition smoothly to their authorized Private Space(s) if applicable.

---

## 3. Shared Authentication, Private Spaces & Security (`AUTH`)

### `AUTH-01` — Registration, Email Verification & Password Recovery
- **Environment:** Shared (`www` & `app`)
- **Purpose:** Ensure only verified identities can hold accounts and recover credentials safely.
- **Target Tier:** MVP (Phase 3)
- **Dependencies:** Supabase Auth
- **Acceptance Criteria:**
  - Users cannot access Private Space routes until email verification is complete.
  - Password reset issues a time-limited single-use recovery link and invalidates the old password upon reset.
  - **Open Ambiguity (Q4):** Confirm email+password vs. Magic Link vs. OAuth support for v1.

### `AUTH-02` — Session Management & Session Revocation
- **Environment:** Private (`app`) & Account Settings
- **Purpose:** Give users visibility and control over active sessions and allow remote sign-out of lost/shared devices.
- **Target Tier:** MVP (Phase 3)
- **Dependencies:** `AUTH-01`
- **Acceptance Criteria:**
  - Users can view active session metadata (device/browser summary, last active timestamp where supported) and trigger "Sign out current device" or "Sign out all other devices / revoke all sessions".
  - Revoking sessions invalidates refresh tokens and blocks further private data queries immediately on token expiry/refresh check.

### `AUTH-03` — Private Space Creation (2-Participant Cap & Multi-Space)
- **Environment:** Private (`app`)
- **Purpose:** Create isolated 2-participant private environments without assuming relationship type, allowing a user to participate in multiple independent spaces.
- **Target Tier:** MVP (Phase 3)
- **Dependencies:** `AUTH-01`, `AUTH-06`
- **Acceptance Criteria:**
  - Creating a space adds the creator as an active member in `private_space_members` and sets participant capacity to a strict maximum of `2`.
  - Attempting to add a 3rd active member fails at the database constraint/RLS/RPC level.
  - One user may create or join Space 1 and Space 2 independently with zero shared visibility between Space 1's partner and Space 2's partner.

### `AUTH-04` — Explicit Partner Invitation & Verification
- **Environment:** Private (`app`)
- **Purpose:** Ensure a second participant joins a private space only via an explicit, verifiable, revocable invitation.
- **Target Tier:** MVP (Phase 3)
- **Dependencies:** `AUTH-03`
- **Acceptance Criteria:**
  - Space creator generates a single-use, cryptographically random, expiring invitation (and can revoke unused invites).
  - Accepting an invite requires an authenticated, email-verified user; once accepted, the invite is marked consumed and cannot be reused.
  - Already full spaces (`member_count = 2`) reject any pending invite acceptance server-side.
  - **Open Ambiguity (Q5):** Confirm email-locked invite vs. shareable invite link/code vs. both.

### `AUTH-05` — Space Member Profiles & Space Switcher
- **Environment:** Private (`app`)
- **Purpose:** Let multi-space users switch cleanly between private spaces and configure optional per-space display context.
- **Target Tier:** MVP (Phase 3)
- **Dependencies:** `AUTH-03`
- **Acceptance Criteria:**
  - Space switcher lists only spaces where `auth.uid()` is an active member.
  - Switching spaces clears in-memory message/media stores and re-subscribes Realtime channels exclusively to the newly selected `space_id`.

### `AUTH-06` — Row-Level Security & Server-Side Authorization
- **Environment:** Shared / Backend
- **Purpose:** Guarantee at the PostgreSQL layer that unauthenticated visitors and non-member accounts cannot read, modify, or infer private space data.
- **Target Tier:** MVP (Phase 3 — mandatory gate for all private tables)
- **Dependencies:** Supabase PostgreSQL
- **Acceptance Criteria:**
  - Every private table has `ENABLE ROW LEVEL SECURITY` and explicit `SELECT/INSERT/UPDATE/DELETE` policies.
  - Automated security test suite passes across all 4 actors: **User A** (allowed), **User B** (allowed within same space), **Unauthenticated Visitor** (denied), **Unauthorised User C / Member of Another Space** (denied).
  - Service-role key is never referenced in client-side code or `NEXT_PUBLIC_*` environment variables.

### `AUTH-07` — Account Deletion, Leaving Space & Data Erasure
- **Environment:** Private (`app`) & Account Settings
- **Purpose:** Give users full sovereignty to leave a space or permanently delete their account and private data.
- **Target Tier:** MVP (Phase 3)
- **Dependencies:** `AUTH-01`, `AUTH-03`
- **Acceptance Criteria:**
  - Users can initiate account deletion via an explicit confirmation step (re-authentication or confirmation phrase).
  - Personal journals, credentials, saved articles, and owned storage assets are purged in accordance with documented policy.
  - **Open Ambiguity (Q11):** Confirm what happens to *shared* space content (messages, photos, memories) when one partner deletes their account or leaves.

### `AUTH-08` — Rate Limiting, Abuse Prevention & Security Logging
- **Environment:** Shared / Backend
- **Purpose:** Protect authentication, invitations, file uploads, and messaging endpoints from brute-force, spam, or resource exhaustion.
- **Target Tier:** MVP (Phase 3)
- **Dependencies:** `AUTH-01`
- **Acceptance Criteria:**
  - Failed logins, invite redemptions, invite generation, and LiveKit token calls enforce per-IP / per-user rate limits returning `429 Too Many Requests`.
  - Security audit log records sensitive events (login, password reset, invite created/accepted/revoked, session revoked, account deleted) without logging plaintext passwords, tokens, or message contents.

---

## 4. Experience B — Private Messaging (`MSG`)

### `MSG-01` — Real-Time 1:1 Text Messaging
- **Environment:** Private (`app`)
- **Purpose:** Provide reliable, responsive, intimate 1:1 text chat within a private space.
- **Target Tier:** MVP (Phase 4)
- **Dependencies:** `AUTH-03`, `AUTH-06`
- **Acceptance Criteria:**
  - Sending a message persists to PostgreSQL and appears on both participants' screens in real time (`<1s` typical under healthy network).
  - Messages render in deterministic chronological order, survive page reload, and display optimistic sending / retry on failure states.

### `MSG-02` — Private Image & Video Sharing
- **Environment:** Private (`app`)
- **Purpose:** Share personal photos and short videos privately inside the space.
- **Target Tier:** V1 (Phase 4)
- **Dependencies:** `MSG-01`, `AUTH-06`
- **Acceptance Criteria:**
  - Files upload only to private storage paths scoped by `space_id`; client verifies allowed MIME type and size limits, and server/storage policies enforce membership.
  - Media renders via short-lived signed URLs (`Cache-Control` restricted) and never via public bucket URLs.

### `MSG-03` — Voice Messages & Playback Controls
- **Environment:** Private (`app`)
- **Purpose:** Record and send intimate audio voice notes with rich playback controls.
- **Target Tier:** V1 (Phase 4)
- **Dependencies:** `MSG-01`, `MSG-02`
- **Acceptance Criteria:**
  - Users can record audio via browser microphone (with live timer & cancel/send preview), upload privately, and play/pause, scrub progress, see total/elapsed duration, and toggle playback speed (`1x`, `1.5x`, `2x`).
  - Denied microphone permission displays a clear, non-blocking recovery prompt.

### `MSG-04` — Message Replies
- **Environment:** Private (`app`)
- **Purpose:** Reply directly to a specific earlier message to keep multi-topic conversations clear.
- **Target Tier:** MVP (Phase 4)
- **Dependencies:** `MSG-01`
- **Acceptance Criteria:**
  - Selecting "Reply" attaches `reply_to_message_id` and displays a compact quoted preview above the new message.
  - Clicking the quote scrolls/highlights the original message if still present; if the parent message expired (`DISP`) or was deleted, the quote renders `"Original message unavailable"` without leaking original text.

### `MSG-05` — Message Reactions
- **Environment:** Private (`app`)
- **Purpose:** Offer lightweight emotional reactions to messages in real time.
- **Target Tier:** MVP (Phase 4)
- **Dependencies:** `MSG-01`
- **Acceptance Criteria:**
  - Either participant can toggle emoji reactions on a message; updates sync via Realtime without duplicating reaction counts per user+emoji.

### `MSG-06` — Message Editing & Deletion
- **Environment:** Private (`app`)
- **Purpose:** Allow authors to fix typos or remove sent messages cleanly.
- **Target Tier:** MVP (Phase 4)
- **Dependencies:** `MSG-01`
- **Acceptance Criteria:**
  - Only the original sender (`sender_id = auth.uid()`) can edit or delete their own message (enforced by RLS).
  - Edited messages show a subtle `"Edited"` label.
  - **Open Ambiguity (Q7):** Confirm "delete for everyone" vs "delete for me", and whether deleted messages leave a tombstone (`"Message deleted"`) or disappear completely.

### `MSG-07` — Read Receipts & Typing Indicators
- **Environment:** Private (`app`)
- **Purpose:** Communicate conversational presence and message visibility naturally.
- **Target Tier:** MVP (Phase 4)
- **Dependencies:** `MSG-01`
- **Acceptance Criteria:**
  - Typing indicators broadcast ephemerally via Supabase Realtime Presence/Broadcast without writing to the database and auto-clear after inactivity timeout.
  - Read receipts update `message_receipts` when the recipient actively views the message in an open conversation tab and update sender UI in real time.
  - Users have a privacy toggle in Personalisation (`PERS-04`) to disable sending read receipts/typing if desired (optional safeguard to confirm).

### `MSG-08` — Message Search
- **Environment:** Private (`app`)
- **Purpose:** Quickly locate past non-expired conversations within the active private space.
- **Target Tier:** V1 (Phase 4)
- **Dependencies:** `MSG-01`
- **Acceptance Criteria:**
  - Searching inside a space matches only non-deleted, non-expired messages belonging to that `space_id`.
  - Selecting a search result jumps to message context in the thread.
  - Note: Availability of server-side full-text search depends directly on Encryption Model decision (Q3).

### `MSG-09` — Private Media Gallery & Message Pinning
- **Environment:** Private (`app`)
- **Purpose:** Curate important pinned messages and browse shared photos/videos in one space gallery.
- **Target Tier:** V1 (Phase 4)
- **Dependencies:** `MSG-01`, `MSG-02`
- **Acceptance Criteria:**
  - Either space member can pin/unpin non-disappearing messages and view the pinned drawer.
  - Media gallery displays thumbnails of non-expired, non-deleted images/videos in that space; expired disappearing media never appears in the gallery.

---

## 5. Experience B — Disappearing Messages (`DISP`)

### `DISP-01` — Disappearing Expiration Modes
- **Environment:** Private (`app`)
- **Purpose:** Let senders choose ephemeral lifespans per message or conversation toggle: `Just seen`, `1 second after viewing`, `5 minutes after viewing`, `1 hour after viewing`, `24 hours`, and `Custom duration`.
- **Target Tier:** V1 (Phase 5)
- **Dependencies:** `MSG-01`, `MSG-02`
- **Acceptance Criteria:**
  - Composer allows selecting any of the 6 expiration modes before sending.
  - Message payload displays its ephemeral policy badge clearly before and after viewing.
  - **Open Ambiguity (Q6):** Clarify exact trigger for `24h` & `Custom` (from send vs. from view) and exact UX rule for `Just seen` (on closing viewport/leaving chat vs. after `N` seconds).

### `DISP-02` — Server-Side View Trigger & Authoritative Timestamps
- **Environment:** Backend / Database
- **Purpose:** Ensure expiration cannot be bypassed by tampering with frontend clocks or skipping client timers.
- **Target Tier:** V1 (Phase 5)
- **Dependencies:** `DISP-01`, `AUTH-06`
- **Acceptance Criteria:**
  - When a recipient views a view-triggered disappearing message, an authoritative server RPC records `viewed_at = now()` (idempotent on first view) and computes `expires_at = now() + ttl_seconds`.
  - Database RLS / secure views enforce `(expires_at IS NULL OR expires_at > now())` on all ordinary API queries so expired rows are never returned.

### `DISP-03` — Offline & Reconnecting Device Synchronization & Cache Purge
- **Environment:** Private (`app`) + Realtime
- **Purpose:** Guarantee expired messages never linger on offline, backgrounded, or reconnecting browsers.
- **Target Tier:** V1 (Phase 5)
- **Dependencies:** `DISP-02`
- **Acceptance Criteria:**
  - If a recipient opens the app offline after `expires_at` passed (or reconnects after sleep), local React state / query caches immediately drop expired items and reconcile against the server.
  - Disappearing messages and attachments are never written to long-lived `localStorage` or Service Worker offline HTTP caches (`Cache-Control: no-store`).

### `DISP-04` — Background Cleanup & Private Media Storage Deletion
- **Environment:** Backend / Scheduled Worker
- **Purpose:** Permanently purge expired database rows and associated private media files from Supabase Storage.
- **Target Tier:** V1 (Phase 5)
- **Dependencies:** `DISP-02`
- **Acceptance Criteria:**
  - A reliable scheduled cleanup job (`pg_cron` / Supabase Edge Function cron) regularly finds rows where `expires_at <= now()`, deletes associated storage objects first (or transactionally logs orphan cleanup), and hard-deletes message rows.
  - After cleanup runs, signed media URLs return 404/invalid and storage bucket contains zero orphaned expired objects.

### `DISP-05` — Transparency, Retention & Non-Screenshot Policy Disclosures
- **Environment:** Private (`app`) & Docs
- **Purpose:** Inform users honestly about privacy boundaries—no false promises against screenshots, screen recordings, or physical cameras.
- **Target Tier:** V1 (Phase 5)
- **Dependencies:** `DISP-01`
- **Acceptance Criteria:**
  - Privacy/Disappearing Info modal clearly explains server deletion vs. database backup retention windows and explicitly states screenshots/screen recording cannot be prevented.

---

## 6. Experience B — Games & Quizzes (`GAME`)

### `GAME-01` — Games Hub & Curated Game Categories
- **Environment:** Private (`app`)
- **Purpose:** Provide a playful, meaningful activity space across 9 categories: Couple trivia, Compatibility quizzes, Would-you-rather, Guess your partner's answer, Truth or dare, Custom quizzes, Personality quizzes, Memory games, Intellectual challenges.
- **Target Tier:** V1 / Phased (Phase 6)
- **Dependencies:** `AUTH-03`, `AUTH-06`
- **Acceptance Criteria:**
  - Games hub categorizes available games cleanly, displays saved favourites, and shows active/in-progress sessions.
  - **Open Ambiguity (Q8):** Confirm phased rollout of the 9 game mechanics (prompt/quiz engine in MVP/V1 vs. specialized Memory card-board & Personality scoring engines).

### `GAME-02` — Multiplayer Game Session Lifecycle
- **Environment:** Private (`app`)
- **Purpose:** Support synchronized live play and asynchronous turn-based sessions between the 2 members of a space.
- **Target Tier:** V1 (Phase 6)
- **Dependencies:** `GAME-01`
- **Acceptance Criteria:**
  - Either partner can start a game session; the other receives an in-space invite/notification and can join immediately or answer asynchronously later.
  - Session states (`waiting_for_partner`, `in_progress`, `completed`, `abandoned`) persist accurately across reloads.

### `GAME-03` — Independent Blind Answers & Answer Reveal
- **Environment:** Private (`app`) & Backend RLS/RPC
- **Purpose:** Prevent partners from seeing each other's answers until both have locked in their response.
- **Target Tier:** V1 (Phase 6)
- **Dependencies:** `GAME-02`, `AUTH-06`
- **Acceptance Criteria:**
  - Before Partner B submits an answer for round `N`, Partner A's API responses contain `NULL` / omit Partner B's answer text (enforced server-side, not merely hidden in CSS).
  - Once both submit, both participants receive the synchronized reveal state in real time.

### `GAME-04` — Score Tracking & Game History
- **Environment:** Private (`app`)
- **Purpose:** Track scores (where applicable, e.g., Couple Trivia / Guess Your Partner's Answer / Memory) and keep an archive of past completed sessions.
- **Target Tier:** V1 (Phase 6)
- **Dependencies:** `GAME-03`
- **Acceptance Criteria:**
  - Completed rounds calculate deterministic scores server-side.
  - Game history shows completed sessions with dates, winners/summaries, and full question/answer review.

### `GAME-05` — Custom Quiz / Game Creation & Saved Favourites
- **Environment:** Private (`app`)
- **Purpose:** Let users author their own custom quizzes/prompts for their partner and bookmark favourite games.
- **Target Tier:** V1 (Phase 6)
- **Dependencies:** `GAME-01`, `GAME-02`
- **Acceptance Criteria:**
  - Users can create a custom quiz with title, questions, and answer options/correct answer inside their space and launch a session from it.
  - Saved favourites persist per user/space and filter cleanly in the Games Hub.

---

## 7. Experience B — Question Library (`QUES`)

### `QUES-01` — Categorised Question Library
- **Environment:** Private (`app`)
- **Purpose:** Offer thoughtful conversation prompts across 8 categories: Funny, Romantic, Personal, Childhood memories, Intellectual, Hypothetical situations, Future aspirations, Intimacy and preferences.
- **Target Tier:** V1 (Phase 6)
- **Dependencies:** `AUTH-03`
- **Acceptance Criteria:**
  - Users can browse and filter prompts across all 8 categories without duplicates or broken metadata.

### `QUES-02` — Daily Question & Random Question Generator
- **Environment:** Private (`app`)
- **Purpose:** Spark effortless daily connection via one shared Daily Question per space plus an on-demand Random Question Generator.
- **Target Tier:** V1 (Phase 6)
- **Dependencies:** `QUES-01`
- **Acceptance Criteria:**
  - Each space surfaces a consistent Daily Question for the calendar day (not changing on page refresh).
  - Random generator draws unseen prompts (with category filter option) without repeating recently shown questions until exhausted.

### `QUES-03` — Saved Questions & Custom Collections
- **Environment:** Private (`app`)
- **Purpose:** Let participants bookmark compelling prompts and group them into custom collections (e.g., *Road Trip Prompts*).
- **Target Tier:** V1 (Phase 6)
- **Dependencies:** `QUES-01`
- **Acceptance Criteria:**
  - Users can save/unsave questions and add custom questions or curated library questions into named collections within their space.

### `QUES-04` — Shared Question Sessions with Optional Hidden Answers
- **Environment:** Private (`app`)
- **Purpose:** Allow both participants to answer a question asynchronously or together, with an optional toggle keeping answers hidden until both respond.
- **Target Tier:** V1 (Phase 6)
- **Dependencies:** `QUES-01`, `GAME-03` (shared blind-reveal pattern)
- **Acceptance Criteria:**
  - When "Hide until both answer" is enabled, server enforces answer secrecy until both participants submit; once both submit, both answers reveal and allow follow-up discussion/chat link.

---

## 8. Experience B — Voice & Video Calling (`CALL`)

### `CALL-01` — 1:1 Voice & Video Call Session (LiveKit)
- **Environment:** Private (`app`) + LiveKit Cloud
- **Purpose:** Enable crystal-clear, reliable 1:1 audio and video calls without building media servers from scratch.
- **Target Tier:** V1 (Phase 8)
- **Dependencies:** `AUTH-03`, `AUTH-06`, LiveKit Cloud credentials
- **Acceptance Criteria:**
  - Server route verifies active space membership and mints a short-lived LiveKit room token restricted to that single `space_id` room and max 2 participants.
  - Non-members attempting to request a LiveKit token receive `403 Forbidden`.

### `CALL-02` — Incoming Call Interface & Signalling
- **Environment:** Private (`app`) + Realtime
- **Purpose:** Notify the recipient of an incoming call with clear caller context and Accept / Decline controls.
- **Target Tier:** V1 (Phase 8)
- **Dependencies:** `CALL-01`
- **Acceptance Criteria:**
  - Initiating a call sends a real-time call invite to the active partner displaying an incoming call overlay with ringtone (respecting user preferences) and Accept/Decline buttons.
  - Timeout/unanswered calls transition cleanly to `missed` state and log in call history.
  - **Open Ambiguity (Q9):** Confirm in-app ringing + Web Push vs. strict in-app ringing when recipient's browser is backgrounded/closed.

### `CALL-03` — In-Call Media Controls, Permissions & Picture-in-Picture
- **Environment:** Private (`app`)
- **Purpose:** Provide intuitive mic mute/unmute, camera on/off, camera flip (mobile), device selection, permission guidance, and Picture-in-Picture (PiP) where supported.
- **Target Tier:** V1 (Phase 8)
- **Dependencies:** `CALL-01`
- **Acceptance Criteria:**
  - Mic and camera toggles immediately mute/unmute LiveKit tracks and display active state clearly to both participants.
  - Browser permission denial triggers a clear actionable guide without crashing the call UI.
  - PiP activates cleanly on browsers supporting `documentPictureInPicture` or video PiP, and degrades gracefully (e.g., floating in-app mini-player) elsewhere.

### `CALL-04` — Connection States & Network Reconnection
- **Environment:** Private (`app`)
- **Purpose:** Keep callers informed during network drops and recover smoothly using LiveKit ICE reconnection.
- **Target Tier:** V1 (Phase 8)
- **Dependencies:** `CALL-01`
- **Acceptance Criteria:**
  - UI clearly distinguishes `ringing`, `connecting`, `connected`, `reconnecting`, and `ended` states.
  - Temporary Wi-Fi/cellular drop transitions to `reconnecting` and resumes audio/video without forcing a full redial when network returns within LiveKit's reconnect window.

### `CALL-05` — Call History Log
- **Environment:** Private (`app`)
- **Purpose:** Maintain a private log of completed, declined, and missed calls inside the space.
- **Target Tier:** V1 (Phase 8)
- **Dependencies:** `CALL-01`, `CALL-02`
- **Acceptance Criteria:**
  - Every call records initiator, media type (voice/video), status (`completed`, `missed`, `declined`, `failed`), start timestamp, and duration.
  - Call history is strictly isolated to the 2 space members via RLS.

---

## 9. Experience B — Shared Experiences & Private Journals (`SHRD`)

### `SHRD-01` — Digital Letters
- **Environment:** Private (`app`)
- **Purpose:** Write thoughtful long-form letters to a partner as meaningful keepsakes (optionally schedule/reveal later).
- **Target Tier:** V1 (Phase 7)
- **Dependencies:** `AUTH-03`, `AUTH-06`
- **Acceptance Criteria:**
  - Author can draft (saved privately while in draft status!), send, or schedule a letter; recipient sees sent letters in a serene letter-reading layout.
  - Drafts remain strictly private to the author until explicitly sent.

### `SHRD-02` — Shared Memories & Chronological Memory Timeline
- **Environment:** Private (`app`)
- **Purpose:** Capture meaningful life events with dates, stories, locations/tags, and photos in a chronological timeline.
- **Target Tier:** V1 (Phase 7)
- **Dependencies:** `AUTH-03`, `AUTH-06`, `SHRD-03`
- **Acceptance Criteria:**
  - Either partner can create/edit shared memories with an event date; Memory Timeline sorts events chronologically and filters by year/tag.

### `SHRD-03` — Shared Photo Collections (Albums)
- **Environment:** Private (`app`)
- **Purpose:** Organize cherished photos into named private collections distinct from ephemeral chat streams.
- **Target Tier:** V1 (Phase 7)
- **Dependencies:** `AUTH-03`, `AUTH-06`
- **Acceptance Criteria:**
  - Photos upload to private space storage, support albums/captions, and render via signed URLs inside a responsive lightbox gallery.

### `SHRD-04` — Important Dates, Shared Calendar & Anniversary Reminders
- **Environment:** Private (`app`)
- **Purpose:** Track shared events, recurring milestones, and anniversaries with timely reminders.
- **Target Tier:** V1 (Phase 7)
- **Dependencies:** `AUTH-03`
- **Acceptance Criteria:**
  - Monthly/agenda calendar displays one-off events and recurring annual milestones/anniversaries.
  - **Open Ambiguity (Q10):** Confirm reminder delivery channels (in-app banner vs. email reminders vs. Web Push).

### `SHRD-05` — Shared Bucket Lists
- **Environment:** Private (`app`)
- **Purpose:** Maintain collaborative lists of shared goals, trips, and experiences to check off together.
- **Target Tier:** V1 (Phase 7)
- **Dependencies:** `AUTH-03`
- **Acceptance Criteria:**
  - Either partner can add, categorize, mark complete (with optional completion date/memory link), and filter pending vs. completed items.

### `SHRD-06` — Shared Notes
- **Environment:** Private (`app`)
- **Purpose:** Keep shared practical or reflective notes accessible to both members of a space.
- **Target Tier:** V1 (Phase 7)
- **Dependencies:** `AUTH-03`
- **Acceptance Criteria:**
  - Both participants can create, view, edit, and archive notes marked as shared within the space.
  - **Open Ambiguity (Q10):** Confirm last-write-wins with conflict warning vs. real-time collaborative CRDT editing.

### `SHRD-07` — Personal Journals & Private Notes (Strict Single-User Isolation)
- **Environment:** Private (`app`)
- **Purpose:** Give each individual a private reflective space for personal thoughts/drafts that the partner **cannot** see unless explicitly shared.
- **Target Tier:** V1 (Phase 7)
- **Dependencies:** `AUTH-03`, `AUTH-06`
- **Acceptance Criteria:**
  - PostgreSQL RLS enforces `author_id = auth.uid()` for `SELECT/INSERT/UPDATE/DELETE` on private journals/notes.
  - Automated security test confirms Partner B receives zero rows when querying Partner A's private notes, even inside the same `space_id`.
  - Explicitly converting/sharing a private note creates or reveals a shared copy only on intentional confirmation.

---

## 10. Experience B — Personalisation & Accessibility (`PERS`)

### `PERS-01` — Application Themes, Light/Dark Modes & Colour Palettes
- **Environment:** Private (`app`) (with tasteful theme tokens shared in Design System)
- **Purpose:** Allow users to tailor their private space's mood across curated accessible palettes (Warm ivory, Beige, Muted burgundy, Sage green, Dusty rose, Soft lavender, Charcoal, Warm grey) in light and dark modes.
- **Target Tier:** V1 (Phase 9)
- **Dependencies:** Design System tokens (Phase 1), `AUTH-01`
- **Acceptance Criteria:**
  - Switching theme/palette updates CSS design tokens smoothly without page reload and persists across sessions.
  - Every supported palette + light/dark combination passes WCAG AA text contrast thresholds.
  - **Open Ambiguity (Q12):** Confirm per-user vs. per-space shared visual theme scope.

### `PERS-02` — Typography Customisation (Font Families & Sizes)
- **Environment:** Private (`app`)
- **Purpose:** Let readers select from vetted typography pairings (Playfair Display, DM Sans, Inter, Lora, Cormorant Garamond, Manrope) and comfortable font scales.
- **Target Tier:** V1 (Phase 9)
- **Dependencies:** `PERS-01`
- **Acceptance Criteria:**
  - Font pairings and size steps (`Small`, `Default`, `Large`, `Extra Large`) apply cleanly across chats, letters, and notes without breaking layout alignment.

### `PERS-03` — Chat Visual Styles (Bubbles, Backgrounds & Density)
- **Environment:** Private (`app`)
- **Purpose:** Customise chat bubble geometry, calm textured/solid chat backgrounds, and interface density (`Compact`, `Comfortable`, `Spacious`).
- **Target Tier:** V1 (Phase 9)
- **Dependencies:** `MSG-01`, `PERS-01`
- **Acceptance Criteria:**
  - Changes apply live in preview and persist to user/space preferences without causing visual clutter or reducing text readability.

### `PERS-04` — Animation, Reduced-Motion & Notification Preferences
- **Environment:** Private (`app`)
- **Purpose:** Respect sensory and privacy preferences—allow disabling decorative animations (`prefers-reduced-motion` + explicit toggle) and configuring discreet notification previews.
- **Target Tier:** V1 (Phase 9)
- **Dependencies:** `AUTH-01`
- **Acceptance Criteria:**
  - Enabling "Reduced motion" (or OS `prefers-reduced-motion: reduce`) disables non-essential Framer Motion transitions immediately.
  - Notification preferences allow hiding message preview text inside alerts/toasts ("New activity" discreet mode) and muting call/message sounds.

