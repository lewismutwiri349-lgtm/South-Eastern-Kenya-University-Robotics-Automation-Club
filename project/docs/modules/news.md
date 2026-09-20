# News Domain

## 1. Feature Overview
Club news articles — draft/publish workflow, public listing and detail
pages. Explicitly separate from Events per `docs/01_Product_Vision.md`.

## 2. Architecture
- `database/schema/news.ts` — `news_articles` table.
- `backend/src/services/news/news-service.ts` — create, update, publish,
  soft-delete, and cursor-paginated public listing.
- `backend/src/lib/slug.ts` — reusable slug generation (Events/Projects
  will reuse this rather than reimplementing).
- `backend/src/routes/news/` — one file per endpoint.
- `frontend/app/(public)/news/` — public listing and detail pages.

## 3. API
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/news` | None | Published only, cursor-paginated |
| GET | `/api/news/:slug` | None | Published only — `404` for drafts, not filtered silently |
| POST | `/api/news` | `super_admin`, `chairperson`, `vice_chairperson`, `secretary`, `moderator` | Creates a draft |
| PATCH | `/api/news/:id` | Same | Partial update |
| POST | `/api/news/:id/publish` | Same | Idempotent — republishing doesn't reset `publishedAt` |
| DELETE | `/api/news/:id` | Same | Soft delete |

## 4. Database
`news_articles` — indexed on `slug` (unique), `author_id` (FK), and a
composite `(status, published_at)` index matching the real public-listing
query. Soft-deleted (`deleted_at`) per `docs/04_Database_Design.md` §5,
since news has moderation/history value.

## 5. Permissions
See `docs/07_User_Roles.md` "News Domain" section. No per-author ownership
restriction yet — any author-role user can edit any article, not just
their own. Deliberate scope limit, not an oversight.

## 6. Edge Cases Handled
- **Drafts return 404, not an empty/filtered result** — prevents leaking
  the existence of unpublished content to unauthenticated requests.
- **Slug collisions** — a second article with the same title gets a
  disambiguated slug (`-<6 hex chars>`), not a database error.
- **Republishing is idempotent** — `publishArticle` preserves the original
  `publishedAt` if already set, so it can't be used to bump an old article
  back to the top of the feed by accident.
- **Cursor pagination correctness** — ordered by `(publishedAt, id)`
  descending, both encoded in the cursor, so ordering stays stable even if
  two articles publish in the same millisecond.

## 7. Tests
- Unit: `slug.test.ts` (6 tests, slugify/disambiguation behavior).
- End-to-end (manual, against local D1, 2026-08-09): full create → draft
  hidden (`404`) → publish → visible (`200`, correct body) → list reflects
  it; RBAC denial for `member` role (`403`); 3-article cursor pagination
  with `limit=2` verified across two pages with no duplicates and a
  correct `nextCursor: null` termination; full-stack proof — real Next.js
  SSR pages rendering real data from the real backend.

## 8. Bug Found During Validation
The `/news` listing page was initially statically prerendered by
`next build` — meaning it would have baked in a single snapshot (or an
error state, if the backend was unreachable at build time) and served it
forever regardless of new articles. Fixed by adding
`export const dynamic = "force-dynamic"`. Worth checking for on every
future public page that fetches genuinely dynamic backend data (Events,
Projects, Awards) — static-by-default is usually right for marketing
content, wrong for anything that changes independently of a deploy.

**Found 2026-09-10, while starting Phase 2 (Public Website) frontend
work** — despite the manual E2E validation above, the News API was
actually unreachable in the merged tree:
- `database/schema/index.ts` only re-exported `./identity`, not `./news`
  — broke `newsArticles` at both the type level and at runtime for any
  query using it.
- `newsRoutes` was fully built and correctly composed internally, but
  `backend/src/index.ts` never mounted it — `/api/news` 404'd
  unconditionally.
- A leftover 0-byte Module-0 scaffold stub, `backend/src/routes/news.ts`,
  collided with the real `backend/src/routes/news/` directory and made
  `import { newsRoutes } from "./routes/news"` resolve to the empty file
  once the mount line above was added — same collision risk exists today
  for `events.ts`, `projects.ts`, and `awards.ts` stubs against their
  future real directories.

All three fixed together (one barrel export line, one mount line, one
dead-file deletion) and verified with a real request/response loop: local
D1 migrated fresh, `wrangler dev` + `next start` both running, a real
article inserted directly into D1, confirmed visible via `GET /api/news`,
the `/news` list page, and the `/news/:slug` detail page. The manual E2E
note above evidently predates one of these regressions — kept as-is
rather than rewritten, since the point of this section is an honest
record of what actually broke and when.

## 9. Future Improvements
- Per-author ownership restriction on edit/delete.
- Rich text / markdown rendering for article body (currently plain text).
- Cover images (ties into the Storage domain / R2 — not built yet).
- Admin authoring UI (the API exists; a form is Phase 6, Admin Dashboard).
