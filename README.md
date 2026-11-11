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
| Framework | Next.js 15 (App Router, TypeScript) |
| Styling | Tailwind CSS v4 |
| UI Primitives | Radix UI + custom design system |
| Animation | Framer Motion |
| Database | Supabase (PostgreSQL 15) |
| Auth | Supabase Auth |
| Realtime | Supabase Realtime |
| Storage | Supabase Storage |
| Video/Voice | LiveKit Cloud |
| Deployment | Vercel |

## Getting Started

### Prerequisites

- Node.js ≥ 20
- A Supabase project (free tier works for development)
- A LiveKit Cloud account (free tier works)
- Vercel account (for deployment)

### Local Development

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env.local
# Fill in your Supabase and LiveKit keys

# 3. Run development server
npm run dev

# 4. Visit http://localhost:3000
```

### Commands

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run start        # Start production server
npm run typecheck    # TypeScript type checking
npm run lint         # ESLint
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
