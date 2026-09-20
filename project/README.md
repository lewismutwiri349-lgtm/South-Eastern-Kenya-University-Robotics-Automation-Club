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

First run only — create the local D1 database and apply every migration:

```bash
npm run db:migrate:local
```

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
npm run --workspace=backend test          # 175 tests, real Workers runtime + local D1
npx tsc --noEmit --project backend        # backend types
npx tsc --noEmit --project frontend       # frontend types
npm run --workspace=database generate     # should report no pending schema changes
```

Tests run in the real Workers runtime against a real local D1 via
`@cloudflare/vitest-pool-workers` — not mocks. See
[`docs/10_Testing_Standards.md`](docs/10_Testing_Standards.md).

## Deploying

Both Workers deploy to an explicit Wrangler environment (a bare
`wrangler deploy` would use the localhost `FRONTEND_URL` and the placeholder
D1 id). Run from the repo root.

**Backend** (API + D1):

```bash
npx wrangler login                                            # once
npm run --workspace=backend db:migrate:production             # apply pending D1 migrations
cd backend && npx wrangler secret put RESEND_API_KEY --env production   # once per env
cd .. && npm run --workspace=backend deploy                   # wrangler deploy --env production
```

**Frontend** (Next.js on OpenNext). `NEXT_PUBLIC_API_BASE_URL` is inlined at
build time from `frontend/.env.production`, so build and deploy from a
checkout where that file holds the real API URL:

```bash
npm run --workspace=frontend cf:deploy   # cf:build + opennextjs-cloudflare deploy --env production
```

Deploy the backend first: the frontend's emailed links and CORS both depend
on `FRONTEND_URL` in `backend/wrangler.toml`, which must equal the frontend's
real origin exactly (no trailing slash).

**Email:** until a sending domain is verified in Resend, mail comes from
Resend's sandbox sender and is only delivered to the Resend account owner.
Verify a domain, then set `EMAIL_FROM` (see `backend/wrangler.toml`).

**Cookies / Safari:** the session cookie is `SameSite=None; Secure` because
the two Workers live on different `workers.dev` subdomains (cross-site).
Safari blocks third-party cookies, so Safari users will not stay signed in
until both Workers share one registrable domain (custom domain, e.g.
`app.<domain>` + `api.<domain>`), after which nothing else needs to change.

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
