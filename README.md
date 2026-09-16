# Robotics & Autonomous Systems Club — Management Platform

A club management platform for the South Eastern Kenya University Robotics &
Automation Club: a public website (news, events, projects, awards, gallery,
resources, contact) plus, over time, applicant, member, leadership and admin
portals.

**Start here:** [`docs/00_Project_Constitution.md`](docs/00_Project_Constitution.md).
It is the single source of truth for how this project is built and extended,
and it wins over any later decision unless explicitly amended. The full
engineering handbook lives in [`docs/`](docs/); per-feature documentation
lives in [`docs/modules/`](docs/modules/).

## Stack

| Piece | What |
|---|---|
| `frontend/` | Next.js (App Router) deployed as a Cloudflare Worker via OpenNext |
| `backend/` | Hono REST API on Cloudflare Workers — the single authoritative API |
| `database/` | Drizzle ORM schema + migrations against Cloudflare D1, shared by both |
| `workers/` | Reserved for cron/async jobs (not yet created) |

The frontend never talks to D1 directly — everything goes through the API.
See [`docs/03_Technical_Architecture.md`](docs/03_Technical_Architecture.md).

## Running locally

Requires Node 22+.

```bash
npm install          # npm workspaces — installs all three packages
```

Backend API (Wrangler local mode, on `http://localhost:8787`):

```bash
npm run dev:backend
```

First run only — create the local D1 database and apply every migration in
ascending order:

```bash
cd backend
for f in ../database/migrations/0*.sql; do
  npx wrangler d1 execute DB --local --file="$f"
done
```

Note: `database/migrations/0000_bitter_maximus.sql` is an orphaned file not
tracked by `meta/_journal.json` and is never applied in any real
environment. The loop above will pick it up — skip it, or apply only the
tags listed in the journal.

Frontend (on `http://localhost:3000`):

```bash
npm run dev:frontend
```

The frontend reads the API base URL from `NEXT_PUBLIC_API_BASE_URL` and
falls back to `http://localhost:8787`.

Email sending (verification, password reset) needs a Resend key. Copy
`backend/.dev.vars.example` to `backend/.dev.vars` and fill it in — without
it, registration still works but the verification email fails and is logged.

## Checks

Run from the repo root:

```bash
npx eslint .                              # lint, all three packages
npm run --workspace=backend test          # 158 tests, real Workers runtime + local D1
npx tsc --noEmit --project backend        # backend types
npx tsc --noEmit --project frontend       # frontend types
npm run --workspace=database generate     # should report no pending schema changes
```

Tests run in the real Workers runtime against a real local D1 via
`@cloudflare/vitest-pool-workers` — not mocks. See
[`docs/10_Testing_Standards.md`](docs/10_Testing_Standards.md).

## Before deploying

`backend/wrangler.toml` still carries placeholder D1 database IDs for the
default and staging environments. Deploying against these will fail or write
nowhere useful. Create a separate D1 database per environment — never share
one between staging and production — and paste the real IDs in. The file
has step-by-step instructions inline.

`frontend/lib/club-info.ts` is intentionally blank (club email, location,
meeting times, socials). Fill it in and the Contact page picks it up with no
other change.

## Current status

Phase 0 (Foundation), Phase 1 (Identity & Access) and Phase 2 (Public
Website) are complete. Phases 3+ — Applicant Portal, Member Portal, full
Project Management, Admin and Leadership dashboards — are not started. See
[`docs/17_Feature_Roadmap.md`](docs/17_Feature_Roadmap.md).
