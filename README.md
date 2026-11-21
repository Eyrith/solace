# Project00

A dual-experience private communication platform with an editorial public face.

## Structure

```
www.example.com   → Public editorial reading portal (Psyche, Aeon, etc.)
app.example.com   → Private 2-person sanctuary (messaging, games, calls)
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router, TypeScript), React 19 |
| Client E2EE Messaging | `matrix-js-sdk` + `@matrix-org/matrix-sdk-crypto-wasm` + `matrix-encrypt-attachment` |
| Backend API & Workers | Python 3.12 + FastAPI (`backend/`), `httpx`, `APScheduler` |
| Styling & UI | Tailwind CSS v4 + Radix UI + Framer Motion |
| Homeserver | Matrix Synapse (`v1.165.0`) + PostgreSQL 16 |
| Database / Auth / Realtime | Supabase (PostgreSQL, Auth, RLS, Storage) |
| Video/Voice | LiveKit (`@livekit/components-react` frontend + `livekit-api` Python tokens/webhooks) |
| Containers | Docker Compose (`frontend`, `backend`, `synapse`, `synapse-postgres`) |

## Getting Started

### Prerequisites

- Node.js ≥ 20
- Python ≥ 3.12 & `uv` (`https://docs.astral.sh/uv/`)
- Self-hosted Synapse (via `docker compose`) & a Supabase project
- LiveKit project (for WebRTC calls)

### Local Development

```bash
# 1. Install frontend dependencies (and WASM crypto artifacts)
npm install

# 2. Install Python backend dependencies
cd backend && uv sync && cd ..

# 3. Set up environment variables
cp .env.example .env.local
# Fill in Supabase, Matrix Synapse, HMAC secrets, and LiveKit keys

# 4. Run Python FastAPI backend (Terminal 1)
cd backend && uv run uvicorn app.main:app --reload --port 8000

# 5. Run Next.js frontend with /api/* rewrites to FastAPI (Terminal 2)
npm run dev

# 6. Visit http://localhost:3000
```

### Commands

```bash
# Frontend
npm run dev          # Start Next.js dev server (port 3000)
npm run build        # Production frontend build
npm run typecheck    # TypeScript type checking
npm run test         # Vitest frontend/schema test suite
npm run lint         # ESLint

# Backend (run inside backend/)
uv run uvicorn app.main:app --reload --port 8000
uv run pytest -v     # Python FastAPI test suite
uv run ruff check .  # Python linting
```

## Documentation

| Document | Description |
|---|---|
| `docs/product-requirements.md` | Full product requirements |
| `docs/feature-inventory.md` | Feature list with acceptance criteria |
| `docs/user-journeys.md` | End-to-end user flows |
| `docs/mvp-scope.md` | MVP phasing plan |
| `docs/architecture.md` | System architecture |
| `docs/database-schema.md` | Full database schema |
| `docs/security-plan.md` | RLS policies and security decisions |
| `docs/development-roadmap.md` | Phased delivery plan |

## Project Status

See `docs/development-roadmap.md` for current phase status.

