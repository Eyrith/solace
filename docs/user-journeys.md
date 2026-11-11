# Core User Journeys

**Document Status:** Draft v0.1 (Division 00 — Product Discovery)  
**Purpose:** Trace end-to-end user flows, edge cases, failure recovery, and privacy boundaries across both Experience A (Public) and Experience B (Private).

---

## Journey 1: Unauthenticated Editorial Discovery, Filtering & Reading History (`PUB-01..PUB-09`)

**Actor:** Unauthenticated Public Visitor  
**Goal:** Discover thoughtful essays without creating an account, bookmark favourites, and optionally enable reading history.

1. Visitor lands on `www.example.com/` (Homepage).
   - Sees minimal, editorial typography, featured curated essays, thematic sections (*Psychology*, *Relationships*, *Philosophy*, *Science*, *Literature*), and curated collections.
   - Zero banners, popups, or UI hints mentioning private spaces or couples messaging.
2. Visitor clicks **Philosophy** in the editorial header (`/philosophy`) or opens **Search & Filters** (`/search?category=philosophy&duration=short`).
   - Filters by publication (e.g., *Aeon*, *The Marginalian*) and reading duration.
3. Visitor clicks **Save** on two interesting articles.
   - Pending Q1 confirmation: bookmarks persist locally in browser storage (or prompt login if server-only is chosen).
4. Visitor visits `/history`:
   - Sees **Reading History is currently OFF** (privacy-first default) with an explicit explanation and an **"Enable Reading History"** toggle.
   - Visitor leaves it OFF -> clicks an article card -> opens the external publisher's canonical URL (`aeon.co/...`) in a new tab with clear attribution; zero history entry is recorded.
   - If visitor opts IN -> subsequent outbound article clicks record `(article_id, clicked_at)` and appear on `/history` with one-click item removal and "Clear All History".

**Edge Cases & Failure States:**
- External publisher lacks reading duration or author metadata -> field is cleanly omitted rather than showing `"0 min"` or `"Unknown"` placeholder noise.
- Empty search result -> helpful reset-filters CTA and suggested collections.

---

## Journey 2: Account Creation, Discreet Entry & 2-Person Private Space Onboarding (`PUB-10`, `AUTH-01..AUTH-06`)

**Actors:** User A (Initiator) and User B (Invited Partner)  
**Goal:** Transition safely from registration to an isolated 2-member private space.

1. User A clicks **Sign in** in the discreet public header (`www.example.com/login`) -> switches to **Create Account** (`/register`).
2. User A registers with email & password -> receives verification email -> verifies email -> redirected to authenticated portal landing / private workspace (`app.example.com`).
3. User A creates a new Private Space (e.g., optional label *"Our Sanctuary"* and optional space nickname).
   - Database inserts `private_spaces` row and `private_space_members` row for User A.
   - Capacity is enforced at **2 active members**.
4. User A generates a **Partner Invitation**:
   - System creates a single-use, cryptographically random, time-limited invitation token (default 48h expiry).
   - User A shares the invite link/code with User B (or sends email invite, pending Q5).
5. User B opens the invite link on `app.example.com/invite/[token]`:
   - If not signed in -> prompted to register/sign in and verify email first, preserving the invite token cleanly across auth redirect.
   - Once verified, User B clicks **Accept Invitation**:
     - Server validates token is unconsumed, unexpired, not revoked, matches email restriction (if enabled), and space has `< 2` members.
     - Atomically adds User B to `private_space_members` and marks invitation consumed.
6. Both User A and User B now see the active Private Space dashboard.

**Security Failure Checks:**
- **User C** (random signed-in user) tries pasting User A's already-accepted invite link -> rejected (`409 Conflict` / `410 Gone`, space full or invite consumed).
- **Unauthenticated visitor** visits `app.example.com/spaces/[id]` -> immediately redirected to login with zero private metadata rendered in SSR HTML.

---

## Journey 3: Multi-Space Switching & Strict Cross-Space Isolation (`AUTH-03`, `AUTH-05`, `AUTH-06`)

**Actor:** User A (member of Space 1 with Partner B, and Space 2 with Partner D)  
**Goal:** Switch between independent private spaces without any data or notification bleed.

1. User A opens the Space Switcher in `app.example.com` and selects **Space 2**.
2. Application unmounts Space 1 Realtime subscriptions, clears in-memory message/media/journal caches, switches route/context to Space 2, and subscribes exclusively to Space 2 channels.
3. User A opens Search, Media Gallery, Calendar, and Chat inside Space 2:
   - Only Space 2 messages, Space 2 media, Space 2 games, and User A's personal Space 2 / personal journals appear.
4. Partner B sends a message in Space 1 while User A is active in Space 2:
   - Unread badge updates discreetly on Space 1 in the switcher without injecting Space 1 message bubbles or previews into Space 2's active viewport.

---

## Journey 4: Real-Time Messaging, Rich Media & Voice Notes (`MSG-01..MSG-09`)

**Actors:** User A and User B inside an active space  
**Goal:** Exchange rich real-time messages naturally across desktop and mobile.

1. User A starts typing -> User B sees subtle typing indicator via ephemeral Realtime broadcast (never stored in DB).
2. User A sends a text message -> optimistic bubble appears immediately -> confirmed via PostgreSQL insert -> User B receives via Realtime subscription.
3. User B views the conversation -> client marks receipt as `read` -> User A sees subtle read receipt update.
4. User A long-presses / clicks Reply on an earlier message, reacts with an emoji, or records a 25-second **Voice Note**:
   - Browser requests mic permission -> records audio -> shows local waveform/duration preview -> uploads to private storage path `{space_id}/voice/{message_id}.webm` -> sends message.
   - User B taps Play -> custom playback bar fetches short-lived signed URL, supports scrubbing and `1x / 1.5x / 2x` speed.
5. User A pins a cherished message or opens the **Private Media Gallery** to browse shared images/videos from the conversation.

**Edge Cases:**
- Mic permission denied -> clear non-destructive toast explaining how to enable microphone access in browser settings; text composer stays usable.
- File exceeds size/MIME limits -> client rejects immediately before upload; storage policy also blocks invalid/oversized objects server-side.

---

## Journey 5: Disappearing Message Lifecycle, Offline Recipients & Reconnection (`DISP-01..DISP-05`)

**Actors:** User A (Sender) and User B (Recipient — initially offline or on second device)  
**Goal:** Enforce trustworthy, server-authoritative disappearing messages without client-timer cheating or lingering offline caches.

1. User A toggles disappearing mode to **5 minutes after viewing** (or *Just seen* / *1 second* / *1 hour* / *24 hours* / *Custom*), attaches a photo + caption, and clicks Send.
   - Message inserts with `ttl_seconds = 300`, `viewed_at = NULL`, `expires_at = NULL` (for view-triggered modes).
2. **Offline Case:** User B's phone is in airplane mode for 2 hours.
   - Message remains safely waiting on server (not yet viewed), or if send-triggered `24h` expires before reconnect (pending Q6), server cleanup purges it before User B ever receives it.
3. User B reconnects and opens the conversation:
   - Client displays message -> fires authenticated server RPC `mark_disappearing_viewed(message_id)`.
   - Server sets `viewed_at = now()` and `expires_at = now() + interval '300 seconds'` authoritatively and broadcasts expiry update to User A's devices.
   - Client displays subtle live countdown indicator derived from server `expires_at`.
4. **Reconnecting Device / Cache Edge Case:** User B closes browser tab at `t = 1 min`, goes offline, and reopens the app at `t = 10 min` (`> expires_at`):
   - Before rendering cached state, client purges any item whose `expires_at <= now()`, executes fresh server fetch (which returns zero expired rows via RLS), and clears temporary memory blobs.
5. **Background Cleanup (`t >= 5 min`):**
   - Scheduled server worker removes the attachment object from private Supabase Storage and hard-deletes the database message row.
   - Signed URL expires/returns `404`; Media Gallery and Message Search no longer contain any trace of the message or photo.

---

## Journey 6: Multiplayer Blind-Reveal Games & Daily Question Session (`GAME-01..GAME-05`, `QUES-01..QUES-04`)

**Actors:** User A and User B  
**Goal:** Play quizzes/games or answer the Daily Question independently with suspenseful simultaneous reveal.

1. User A opens **Questions** -> sees today's **Daily Question** (e.g., under *Future Aspirations*).
2. Toggle **"Keep answers hidden until both respond"** is ON.
3. User A writes and submits their response:
   - UI shows *"Waiting for [Partner] to answer"* — User A cannot yet edit/peek at partner status beyond *"Submitted / Pending"*.
4. User B opens the space 3 hours later -> sees the Daily Question prompt with *"Your partner has answered — add yours to reveal both"* -> cannot view User A's answer in UI or network payload (enforced server-side!).
5. User B submits their response -> server flips session state to `revealed` -> both answers unlock simultaneously in real time with option to discuss in chat or save to favourites.
6. Similar blind-answer engine powers *Would You Rather*, *Guess Your Partner's Answer*, and *Compatibility Quizzes*, storing completed results in **Game History**.

---

## Journey 7: 1:1 Voice & Video Call via LiveKit (`CALL-01..CALL-05`)

**Actors:** User A (Caller) and User B (Callee)  
**Goal:** Conduct a smooth 1:1 audio/video call with graceful permission and network recovery handling.

1. User A taps **Video Call** inside the space header.
   - Server creates `call_sessions` row (`status = 'ringing'`), checks space membership, and mints a LiveKit room token for User A.
   - Realtime call signal triggers **Incoming Call Overlay** on User B's active app session (and optional Web Push if approved in Q9).
2. **Happy Path:** User B taps **Accept**:
   - Browser prompts for camera/mic permissions -> server mints LiveKit token for User B -> both join isolated LiveKit room -> status transitions `connecting -> connected`.
   - Participants toggle mic, camera, mobile front/back camera, or activate Picture-in-Picture while browsing shared photos/notes in the space.
3. **Network Drop:** User B walks out of Wi-Fi onto cellular -> LiveKit triggers `reconnecting` state banner without dropping the call session -> reconnects automatically within seconds.
4. **End / Decline / Missed:** Either user clicks **End Call** -> LiveKit disconnects -> server logs final duration and updates **Call History**. If User B never answers within ring timeout (e.g., 45s), status becomes `missed` and posts a quiet missed-call entry in Call History.

---

## Journey 8: Shared Memories vs. Personal Private Journal Isolation (`SHRD-01..SHRD-07`)

**Actors:** User A and User B  
**Goal:** Build shared keepsakes together while protecting strictly private personal reflections.

1. User A navigates to **Private Journal** (`SHRD-07`) and writes a personal reflection.
   - Saved with `owner_id = User A`, `is_shared = false`.
   - User B opens the space's Shared Notes, Memory Timeline, and Global Space Search -> User A's private journal entry is 100% invisible and unreachable via API/RLS.
2. Later, User A intentionally chooses **"Share as a Letter"** or **"Promote to Shared Note"** on a specific entry, confirms the warning dialog, and sends it -> only *that* explicitly shared item becomes visible to User B.
3. User A & User B co-build **Shared Memories** (uploading trip photos to an album, logging milestone date on **Shared Calendar** with Anniversary Reminder, and checking off items on their **Bucket List**).

---

## Journey 9: Personalisation & Accessibility Preferences (`PERS-01..PERS-04`)

**Actor:** User A  
**Goal:** Tailor the private experience for comfort, visual taste, and accessibility.

1. User A opens **Personalisation Settings** in `app.example.com`.
2. Selects **Dusty Rose / Warm Ivory** palette, **Dark Mode**, **Cormorant Garamond + DM Sans** font pairing, **Large** text scale, **Compact** density, and **Reduced Motion**.
3. Live preview updates immediately; saving persists tokens so every page (Chat, Letters, Games, Calendar) reflects the preferences smoothly with verified WCAG AA contrast.
4. User A enables **Discreet Notifications** so desktop/browser notifications display *"New update"* instead of revealing private message text.

---

## Journey 10: Session Revocation & Account Deletion (`AUTH-02`, `AUTH-07`)

**Actor:** User A  
**Goal:** Maintain full control over security and exit cleanly if ever desired.

1. User A suspects they stayed logged in on an old tablet -> opens **Security & Sessions** -> sees active sessions -> clicks **"Revoke all other sessions"**.
2. Server revokes refresh tokens; the old tablet is signed out on next request/refresh check.
3. If User A triggers **Delete Account**:
   - System requires password/re-authentication confirmation and clearly explains what happens to personal data vs. shared space artifacts (per Q11 decision).
   - Server deletes auth user, private journals, saved bookmarks/history, active sessions, and owned storage assets, logging a non-PII deletion audit record.

