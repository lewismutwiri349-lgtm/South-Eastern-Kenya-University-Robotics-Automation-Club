# 03 — Technical Architecture

## 1. High-Level Overview

```
┌───────────────────────┐         ┌──────────────────────┐
│   frontend/            │  HTTPS  │   backend/            │
│   Next.js on           │────────▶│   Hono on Cloudflare  │
│   Cloudflare Workers   │◀────────│   Workers (REST API)  │
│   (via OpenNext)       │  JSON   └──────────┬────────────┘
└─────────────────────────┘
                                            │
                          ┌─────────────────┼─────────────────┐
                          ▼                 ▼                 ▼
                 ┌────────────────┐ ┌───────────────┐ ┌───────────────┐
                 │  Cloudflare D1  │ │ Cloudflare R2 │ │  workers/      │
                 │  (relational DB)│ │ (file storage)│ │  (cron / async │
                 │                 │ │  images, CAD, │ │  jobs, email,  │
                 │                 │ │  PDFs, ZIPs)  │ │  notifications)│
                 └────────────────┘ └───────────────┘ └───────────────┘
```

- **frontend/** renders the public site (SSG/ISR for SEO on News, Events,
  Projects, Gallery) and the authenticated portals (client-rendered behind
  auth). It never talks to D1/R2 directly — always through the API.
- **backend/** is the single authoritative API. Owns all business logic,
  validation, and permission checks.
- **workers/** hosts anything that isn't a direct request/response cycle:
  scheduled digest emails, application-status reminders, cron-based report
  generation, etc. Communicates with D1/R2 the same way backend/ does, via
  shared database/ package.
- **database/** holds Drizzle schema definitions, migrations, and seed
  scripts — imported by both `backend/` and `workers/` so schema is defined
  exactly once.

## 2. Repository Structure

```
robotics-club-platform/
│
├── docs/                        # This documentation set
│
├── frontend/                    # Next.js app (Cloudflare Workers, via OpenNext)
│   ├── app/                     # App Router: route segments
│   │   ├── (public)/            # Home, About, Divisions, Projects, News,
│   │   │                        # Events, Awards, Gallery, Resources, Contact
│   │   ├── (auth)/              # Register, Login, Reset Password, Verify Email
│   │   ├── (applicant)/         # Applicant portal
│   │   ├── (member)/            # Member portal
│   │   ├── (leadership)/        # Leadership dashboard
│   │   └── (admin)/             # Admin dashboard
│   ├── components/              # Reusable UI components
│   ├── lib/                     # API client, auth helpers, utils
│   ├── styles/
│   └── public/
│
├── backend/                     # Hono API (Cloudflare Worker)
│   ├── src/
│   │   ├── routes/              # One file per resource (auth, users,
│   │   │                        # applications, projects, events, etc.)
│   │   ├── middleware/          # Auth, RBAC, validation, error handling
│   │   ├── services/            # Business logic, separate from route handlers
│   │   ├── schemas/             # Zod validation schemas (shared shape with frontend types)
│   │   └── index.ts
│   └── wrangler.toml
│
├── workers/                     # Auxiliary Workers (cron, email, notifications)
│   └── ...
│
├── database/                    # Drizzle ORM
│   ├── schema/                  # Table definitions, one file per domain
│   ├── migrations/
│   └── seed/
│
├── tests/                       # Cross-cutting integration/e2e tests
│
└── shared/                      # (to be introduced if/when needed) types
                                   shared between frontend and backend
```

## 3. Request Flow (typical authenticated request)
1. Next.js client calls `lib/api.ts` → hits `backend/` Worker over HTTPS.
2. Hono middleware chain: CORS check → session/JWT verification → RBAC check
   for the route → Zod schema validation of body/query.
3. Route handler delegates to a `services/` function (business logic lives
   here, not in the route handler — keeps handlers thin and testable).
4. Service talks to D1 via Drizzle and/or R2 for file objects.
5. Structured JSON response returned; errors follow a consistent shape
   (defined in `docs/05_API_Standards.md`, written when the API module starts).

## 4. Environments
- **Local dev:** Wrangler local mode + D1 local SQLite + Next.js dev server.
- **Staging:** Separate Cloudflare project/environment, separate D1 database.
- **Production:** Separate Cloudflare project, production D1 + R2 buckets.

Environment separation is enforced via `wrangler.toml` environment blocks —
no shared databases between staging and production, ever.

## 5. Why This Architecture Fits the Project's Scope
- Public pages (Home, News, Events, Projects, Gallery) benefit from Next.js
  SSR/ISR for SEO and fast first paint — this matters for a club that wants
  external visibility (recruiting, sponsors, showcasing work).
- The clear frontend/backend split means the API can later serve a mobile
  app or third-party integrations without rework.
- D1 + R2 keep everything inside Cloudflare's ecosystem — no cross-cloud
  latency or extra billing relationships, and both scale automatically.
- Drizzle schema as a single shared source avoids the classic "schema drift
  between ORM and raw SQL" problem as the app grows over years.

## 6. Domain Alignment
Per `docs/01_Product_Vision.md`, the platform is organized around business
domains (Identity, Membership, Projects, Events, News, Awards,
Administration, Notifications, Storage, Analytics — plus reserved Research
and Competitions domains for later). Concretely, this means:
- `backend/src/services/<domain>/` — one folder per domain, owns that
  domain's business logic
- `backend/src/routes/<domain>/` — route handlers grouped by domain, thin,
  delegate to services
- `database/schema/<domain>.ts` — one schema file per domain
- `frontend/app/` route groups map to domains where a domain has public or
  portal-facing pages, but a domain does not need a 1:1 page — e.g.
  Notifications has no dedicated page but is used across many

This mapping is aspirational for now — it becomes concrete when the
scaffolding module creates these folders.

## 7. Frontend Deployment: OpenNext, Not Pages (superseded decision)
Originally planned as Next.js on Cloudflare Pages via `@cloudflare/next-on-pages`.
Discovered during Module 1 scaffolding (2026-08-04) that this package is
deprecated — Cloudflare now recommends `@opennextjs/cloudflare`, deploying
Next.js directly as a Cloudflare Worker rather than to Pages. This gives
full Node.js runtime support (vs. Edge-only previously), meaning ISR, image
optimization, and more Next.js features work without workarounds.
Practical effect: both `frontend/` and `backend/` now deploy as Cloudflare
Workers — still separate deployable units, just the same underlying
product rather than two different Cloudflare products.

## 8. Deferred Decisions (intentionally not decided yet)
These will be decided when their owning module is reached, not now:
- Exact RBAC permission matrix → `docs/07_User_Roles.md`, built with Auth module
- Email provider for verification/notifications → built with Auth module
- File upload size/type limits and virus scanning approach → built with Projects module
- Aptitude test question engine/timing mechanism → built with Applicant Portal module

## Changelog
- **2026-08-04** — Initial architecture drafted: Next.js on Cloudflare Pages, Hono on Workers, D1/R2, domain alignment added.
- **2026-08-04** — Frontend deployment changed from Cloudflare Pages (`next-on-pages`) to Cloudflare Workers via OpenNext, per §7, after the deprecation was surfaced during Module 1 scaffolding and confirmed with the project owner.
