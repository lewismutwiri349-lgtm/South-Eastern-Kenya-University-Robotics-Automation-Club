# Resources — Phase 2 (Public Website)

## 1. Feature Overview

A curated library of external material the club recommends — datasheets,
tutorials, toolchain downloads, standards. Staff with a content-authoring
role create a resource (title, description, a link, an optional category),
publish it, and visitors browse the library at `/resources`, filterable by
category, with a detail page per resource that carries the longer
description and the outbound link.

A resource is a *link out*, not a hosted file. Hosting files is the Phase 5
upload pipeline.

## 2. Architecture

Same shape as News, Events, Projects, Awards and Gallery, per
`docs/03_Technical_Architecture.md` §6.

| Layer | Files |
|---|---|
| Schema | `database/schema/resources.ts` (re-exported from `database/schema/index.ts`) |
| Migration | `database/migrations/0006_cuddly_otto_octavius.sql` |
| Service | `backend/src/services/resources/resources-service.ts` |
| Validation | `backend/src/schemas/resources.ts` |
| Routes | `backend/src/routes/resources/` |
| Mount | `backend/src/index.ts` → `/api/resources` |
| Frontend | `frontend/app/(public)/resources/page.tsx`, `frontend/app/(public)/resources/[slug]/page.tsx` |

New table: `resources`. No shared tables with any other domain.

## 3. API

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/api/resources` | Public | Published only, newest `publishedAt` first. Query: `limit` (1–50, default 20), `cursor`, `category` |
| `GET` | `/api/resources/categories` | Public | Distinct categories across published resources, sorted |
| `GET` | `/api/resources/:slug` | Public | Published only; a draft returns `404` |
| `POST` | `/api/resources` | Author roles | Creates a draft. `201 { data: { id, slug } }` |
| `PATCH` | `/api/resources/:id` | Author roles | Partial update |
| `POST` | `/api/resources/:id/publish` | Author roles | Idempotent |
| `DELETE` | `/api/resources/:id` | Author roles | Soft delete. `204`, no body |

Create/update body: `title`, `description`, `url`, `category` (optional).

Ordering uses `publishedAt` rather than a separate domain date, unlike
Gallery/Awards/Events — a link has no "happened on" moment, so there is no
second date to order by.

**Route order is load-bearing**, same as Gallery: `/categories` is
registered before `/:slug`. Pinned by a regression test.

## 4. Database

`resources` — columns and their rationale:

- `url` is the resource itself. When Phase 5's upload pipeline lands, a
  hosted file gets an R2-backed URL written into this same column, so
  hosting later does not require a schema change.
- `category` is free text, nullable, not an enum — same reasoning as
  Gallery's and Awards' `category`.
- No separate domain date, per §3 above.
- Soft-deleted via `deletedAt` per `docs/04_Database_Design.md` §5.

Indexes: unique on `slug`, plain on `author_id`, composite on
`(status, published_at)` matching the public listing query.

## 5. Permissions

| Route | Allowed roles |
|---|---|
| `GET /api/resources` | Anyone (unauthenticated) |
| `GET /api/resources/categories` | Anyone (unauthenticated) |
| `GET /api/resources/:slug` | Anyone (unauthenticated) |
| `POST /api/resources` | `super_admin`, `chairperson`, `vice_chairperson`, `secretary`, `moderator` |
| `PATCH /api/resources/:id` | Same |
| `POST /api/resources/:id/publish` | Same |
| `DELETE /api/resources/:id` | Same |

Mirrored into `docs/07_User_Roles.md`.

## 6. Edge Cases

- **`javascript:` and `data:` URLs are rejected at the schema level.** This
  is the one genuinely security-relevant decision in this module. A bare
  `z.string().url()` accepts any scheme WHATWG considers valid, and these
  URLs are rendered as clickable links on a public page — so an
  unrestricted scheme is a stored-XSS vector per
  `docs/08_Security_Standards.md`. `backend/src/schemas/resources.ts`
  defines an `httpUrl` refinement restricting to `http:`/`https:`, applied
  on both create and update. Checked server-side, never only in the form.
- **Outbound links carry `rel="noopener noreferrer"` and `target="_blank"`**
  so the opened tab gets no handle on `window.opener`.
- **The detail page does not use the shared `<Button>` component**, which
  renders a `next/link` for in-app navigation. An outbound link needs
  `target`/`rel`, which `next/link` would carry into a client-side route.
- **Draft slugs return `404`, not `403`** — same enumeration reasoning as
  Gallery.
- **Deleting an already-deleted resource** returns `404`.
- **The listing shows the link host** next to each "Open" link, so a reader
  knows where they are being sent before clicking.

## 7. Tests

- `backend/tests/integration/content/tables.test.ts` — `resources` CRUD
  against real local D1.
- `backend/tests/api/resources/resources.test.ts` — 29 tests covering every
  route: success, validation failure, and the full 401/403/200 matrix.
  Includes explicit `javascript:`/`data:` rejection tests on both create and
  update, a positive test that plain `http://` is accepted, category
  filtering, draft invisibility, and the mount-order regression.

## 8. Future Improvements

- **Hosted files** — Phase 5. Writes into the existing `url` column.
- **Admin UI for authoring** — Phase 6.
- **Link-rot checking** — a scheduled job in `workers/` that flags dead
  URLs. Genuinely useful for a link library that will outlive its authors,
  but it is a Notifications/cron concern and outside Phase 2.
- **Member-only resources** — everything here is public. A visibility flag
  would need the Member Portal's access model (Phase 4) to mean anything.
