# Events Domain

## 1. Feature Overview
Club events — draft/publish workflow, public listing (soonest-first) and
detail pages. Explicitly separate from News per `docs/01_Product_Vision.md`.

This is the first Events slice: content management (create, edit, publish,
list, view). Registration, attendance tracking, and calendar/ICS export —
called out alongside Events in `docs/01_Product_Vision.md` and
`docs/17_Feature_Roadmap.md` — are deliberately deferred to a later
sub-slice rather than guessed at here. See §8.

## 2. Architecture
- `database/schema/events.ts` — `events` table.
- `backend/src/services/events/events-service.ts` — create, update, publish,
  soft-delete, and cursor-paginated public listing.
- `backend/src/lib/slug.ts` — reused as-is from News, per
  `docs/02_Engineering_Principles.md` §2 (no reimplementation).
- `backend/src/routes/events/` — one file per endpoint.
- `frontend/app/(public)/events/` — public listing and detail pages.

## 3. API
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/events` | None | Published only, cursor-paginated, ordered soonest-first by `startAt` |
| GET | `/api/events/:slug` | None | Published only — `404` for drafts, not filtered silently |
| POST | `/api/events` | `super_admin`, `chairperson`, `vice_chairperson`, `secretary`, `moderator` | Creates a draft. `400` if `endAt` is before `startAt` |
| PATCH | `/api/events/:id` | Same | Partial update |
| POST | `/api/events/:id/publish` | Same | Idempotent — republishing doesn't reset `publishedAt` |
| DELETE | `/api/events/:id` | Same | Soft delete |

## 4. Database
`events` — indexed on `slug` (unique), `organizer_id` (FK), and a composite
`(status, start_at)` index matching the real public-listing query.
Soft-deleted (`deleted_at`) per `docs/04_Database_Design.md` §5, same
rationale as News (moderation/history value).

Fields: `title`, `slug`, `description`, `location`, `start_at` (required),
`end_at` (optional), `organizer_id`, `status`, `published_at`,
`deleted_at`, `created_at`, `updated_at`.

## 5. Permissions
Same role set as News — see `docs/07_User_Roles.md` §4. No Events-specific
role exists yet (e.g. a narrower "event organizer" role scoped to their own
events); reusing News's content-management trust boundary was a deliberate
choice to avoid inventing a permission model ahead of product decisions,
per `docs/18_AI_Operating_Manual.md` §6. No per-organizer ownership
restriction either — any of the above roles can edit any event, matching
News's same deliberate scope limit.

## 6. Edge Cases Handled
- **Drafts return 404, not an empty/filtered result** — same rationale as
  News: prevents leaking the existence of unpublished events.
- **Slug collisions** — disambiguated the same way as News
  (`-<6 hex chars>` suffix).
- **`endAt` before `startAt` is rejected at creation** (`400`, zod
  `.refine`). On update, this is only re-validated when *both* fields are
  present in the same request — updating just one field against the
  other's existing stored value is not re-validated. Flagged as a known
  gap, not silently accepted as correct; see §8.
- **Republishing is idempotent** — mirrors News's `publishArticle` logic
  exactly.
- **Cursor pagination correctness** — ordered by `(start_at, id)`
  ascending (soonest-first), both encoded in the cursor. This is the
  opposite direction from News's `(published_at, id)` descending
  (newest-first) — a deliberate difference, not an inconsistency: the
  natural public query for events is "what's coming up", not "what's
  newest".

## 7. Tests
- End-to-end (manual, against local D1 + a live local Worker + a live
  Next.js dev server, 2026-08-14): full register → promote → login →
  create → reject-invalid-dates (`400`) → draft hidden from public list
  and detail (`404`) → publish → visible on both public endpoints →
  partial update → soft-delete → confirmed removed from public list →
  update-nonexistent (`404`). Then re-verified full-stack: a real
  published event, created through the real API, rendered correctly by
  the real Next.js SSR pages (`/events` and `/events/:slug`) via a real
  fetch to the real backend — no mocked data at any layer.
- No dedicated unit test file — `events-service.ts` has no branchy pure
  logic beyond what `slug.test.ts` already covers (shared with News,
  which has the same gap). Automated integration tests remain a project-
  wide gap already tracked in `docs/modules/identity-auth.md` §8.

## 8. Future Improvements
- Registration (RSVP/sign-up) — the next logical sub-slice.
- Attendance tracking — depends on registration existing first.
- Calendar view / ICS export.
- Countdown display (`docs/01_Product_Vision.md` mentions this as a
  Events feature) — a frontend-only addition once there's a concrete
  "next event" to count down to; not built since it's presentational
  rather than structural, easy to add later without a schema change.
- A `cancelled` status distinct from `archived`/soft-delete — real-world
  events get cancelled without being deleted or "just archived". Not
  added in this slice to avoid guessing at a status model ahead of the
  registration/attendance work, which will likely need to be aware of it
  anyway (e.g. auto-notify registrants on cancellation).
- Re-validate `endAt >= startAt` on partial updates against the *stored*
  value, not just within a single request's provided fields (§6).
- Per-organizer ownership restriction on edit/delete (same gap as News).
- Admin authoring UI (the API exists; a form is Phase 6, Admin Dashboard).

## 9. Bugs Found During Validation (Pre-Existing, Not Introduced Here)
Both were in already-completed modules, discovered only because this work
touched the same files. Flagged per `docs/09_Development_Workflow.md` §5
rather than silently folded in — recorded here for visibility:
- `database/schema/index.ts` never re-exported `./news`, so
  `backend/src/services/news/news-service.ts`'s import of `newsArticles`
  through the schema barrel did not typecheck. Fixed in the same commit
  that added `./events` to the same file.
- `backend/src/index.ts` defined `newsRoutes` but never mounted it —
  `/api/news` was live nowhere; the entire News API was dead code. Fixed
  in the same commit that mounted `/api/events`.
- Two empty leftover stub files, `backend/src/routes/news.ts` and
  `backend/src/routes/events.ts`, predated the real `routes/news/` and
  `routes/events/` directories and were never cleaned up. Removed — the
  `events.ts` stub was directly superseded by this work; `news.ts` was the
  same class of dead file and was blocking `tsc` once `/api/news` was
  actually imported.
