# Events Domain

## 1. Feature Overview
Club events — draft/publish workflow, public listing (soonest-first) and
detail pages. Explicitly separate from News per `docs/01_Product_Vision.md`.

This is the first Events slice: content management (create, edit, publish,
list, view) — see §1–§9 below. §10 covers the registration/waitlist
sub-slice added 2026-08-15. Attendance tracking and calendar/ICS export —
also called out alongside Events in `docs/01_Product_Vision.md` and
`docs/17_Feature_Roadmap.md` — remain deferred; see §11.

## 2. Architecture
- `database/schema/events.ts` — `events` table (now includes `capacity`)
  and `event_registrations` table.
- `backend/src/services/events/events-service.ts` — create, update,
  publish, soft-delete, and cursor-paginated public listing.
- `backend/src/services/events/registration-service.ts` — register,
  cancel, waitlist promotion, and the organizer-facing roster.
- `backend/src/lib/slug.ts` — reused as-is from News, per
  `docs/02_Engineering_Principles.md` §2 (no reimplementation).
- `backend/src/routes/events/` — one file per endpoint.
- `frontend/app/(public)/events/` — public listing and detail pages.
  Registration has no frontend UI yet — API only; see §11.

## 3. API
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/events` | None | Published only, cursor-paginated, ordered soonest-first by `startAt` |
| GET | `/api/events/:slug` | None | Published only — `404` for drafts, not filtered silently. Includes `capacity` (null = uncapped) |
| POST | `/api/events` | `super_admin`, `chairperson`, `vice_chairperson`, `secretary`, `moderator` | Creates a draft. `400` if `endAt` is before `startAt`. `capacity` optional |
| PATCH | `/api/events/:id` | Same | Partial update |
| POST | `/api/events/:id/publish` | Same | Idempotent — republishing doesn't reset `publishedAt` |
| DELETE | `/api/events/:id` | Same | Soft delete |
| POST | `/api/events/:id/register` | Any authenticated user | Registers, or waitlists if at capacity. `409 ALREADY_REGISTERED` if already registered/waitlisted. `404` if not found/not published |
| POST | `/api/events/:id/cancel-registration` | Any authenticated user | Self-service; cancels the caller's own registration and promotes the next waitlisted registrant if a seat opened. `404` if no active registration |
| GET | `/api/events/:id/registrations/me` | Any authenticated user | Caller's own status (`registered`/`waitlisted`/`cancelled`/`null`) |
| GET | `/api/events/:id/registrations` | Same organizer roles as content management | Full roster, cursor-paginated, ordered by registration order |

## 4. Database
`events` — indexed on `slug` (unique), `organizer_id` (FK), and a composite
`(status, start_at)` index matching the real public-listing query.
Soft-deleted (`deleted_at`) per `docs/04_Database_Design.md` §5, same
rationale as News (moderation/history value).

Fields: `title`, `slug`, `description`, `location`, `start_at` (required),
`end_at` (optional), `organizer_id`, `status`, `published_at`, `capacity`
(nullable — null means uncapped), `deleted_at`, `created_at`, `updated_at`.

`event_registrations` — one row per `(event_id, user_id)` ever (unique
index); re-registering after a cancellation updates the existing row
rather than inserting a new one. Not soft-deleted the way `events` is —
`cancelled` is a first-class status on the row, not a tombstone, since a
cancelled registration has ongoing value (frees a waitlist seat, shows in
an organizer's history). Indexed on `user_id` (FK) and on the composite
`(event_id, status, registered_at)`, which is the one index doing double
duty for both real queries this table serves: counting active
registrants against capacity, and finding the oldest waitlisted row to
promote on a cancellation.

## 5. Permissions
Content-management routes (create/update/publish/delete/roster) use the
same role set as News — see `docs/07_User_Roles.md` §4. No
Events-specific role exists yet (e.g. a narrower "event organizer" role
scoped to their own events); reusing News's content-management trust
boundary was a deliberate choice to avoid inventing a permission model
ahead of product decisions, per `docs/18_AI_Operating_Manual.md` §6. No
per-organizer ownership restriction either — any of the above roles can
edit any event, matching News's same deliberate scope limit.

Registration (`register`/`cancel-registration`/`registrations/me`) is
open to **any authenticated user**, deliberately not gated to the same
organizer roles — confirmed with Lewis 2026-08-14. This is the one place
in the Events domain where the permission boundary isn't "reuse News's
pattern": registering for an event is fundamentally a member action, not
a content-management action.

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

## 8. Future Improvements (Content Management, §1–§9)
- Countdown display (`docs/01_Product_Vision.md` mentions this as a
  Events feature) — a frontend-only addition once there's a concrete
  "next event" to count down to; not built since it's presentational
  rather than structural, easy to add later without a schema change.
- A `cancelled` **event** status distinct from `archived`/soft-delete —
  real-world events get cancelled without being deleted or "just
  archived". Now more clearly motivated by §10 existing (an organizer
  cancelling an event should arguably notify registrants) but still not
  added, to avoid guessing at that notification behavior; see §11.
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

## 10. Registration & Waitlisting (added 2026-08-15)

### 10.1 Scope decisions
Confirmed with Lewis before building, rather than guessed at (per
`docs/18_AI_Operating_Manual.md` §6):
- Capacity limits + waitlisting: **in scope** for this slice.
- Who can register: **any authenticated user** (no role restriction, no
  applicant exclusion).
- Cancellation: **self-service** — a user cancels their own registration;
  there's no organizer-removes-someone-else endpoint (see §11).

### 10.2 State model
A registration is exactly one of `registered`, `waitlisted`, `cancelled`.
One row per `(event, user)` ever — see §4. Capacity is per-event and
optional (`null` = uncapped, every registration lands `registered`
directly, the waitlist path never triggers).

### 10.3 Waitlist promotion
Promotion happens **only** at the moment a `registered` registrant
cancels — there's no scheduled sweep or cron. `cancelRegistration` calls
`promoteNextWaitlisted`, which promotes the single oldest `waitlisted` row
for that event (FIFO by `registeredAt`) to `registered`. If nobody's
waitlisted, it's a no-op. Verified end-to-end (§10.5): cancelling a
`registered` row with someone waitlisted correctly flips that person to
`registered` in the same request.

### 10.4 Known limitation: capacity check is not atomic
`registerForEvent` reads the current registered count, then decides
`registered` vs `waitlisted`, then writes — three separate steps, not one
atomic operation. D1/SQLite serializes individual statements but not this
multi-step flow across a Worker's async round trips. Two genuinely
concurrent registration requests for the last open seat could both read
the same under-capacity count and both get seated, overfilling by a small
margin.

This is flagged, not silently accepted as correct. It wasn't solved with
a heavier locking/transaction scheme up front because: (a) club-scale
event registration traffic arrives essentially one request at a time in
practice, not as a stampede, and (b) the fix (e.g. a single atomic
`INSERT ... SELECT COUNT` style statement, or a D1 batch with the count
check baked into the write) is a self-contained, low-risk follow-up that
doesn't need to block this slice from shipping. Tracked in §11.

### 10.5 Tests
End-to-end (manual, against local D1 + a live local Worker, 2026-08-15),
using a real `capacity: 2` event and three real registrant accounts:
1. First two registrants → both `registered`.
2. Third registrant → `waitlisted` (capacity full).
3. Duplicate registration attempt by an already-registered user →
   `409 ALREADY_REGISTERED`.
4. Waitlisted user checks their own status → `waitlisted`, correctly.
5. Organizer views the roster → all three rows present with correct
   statuses.
6. A `registered` user cancels → the waitlisted user is auto-promoted to
   `registered` in the same request, verified by immediately re-checking
   their status.
7. The user who cancelled checks their own status → `cancelled`.
8. That same user re-registers → correctly computes `waitlisted` again
   (the two seats are now held by the other original registrant and the
   just-promoted user).
9. Cancelling an already-`cancelled` registration → `404`.
10. Unauthenticated registration attempt → `401`.
11. Non-organizer viewing the roster → `403`.

All 11 passed. No dedicated unit test file for the same reason noted in
§7 for `events-service.ts` — no branchy pure logic isolated from D1 access
to test without a D1 test harness (project-wide gap, tracked in
`docs/modules/identity-auth.md` §8).

## 11. Future Improvements (Registration, §10)
- Fix the capacity-check race condition (§10.4) with an atomic
  read+decide+write.
- Organizer-initiated removal of a registrant (distinct from self-service
  cancel) — not built now to avoid guessing at whether it should notify
  the registrant, and whether it should behave differently from a
  self-cancel for waitlist-promotion purposes.
- Email notification on waitlist promotion — a promoted registrant
  currently has no way to know except by checking `registrations/me`
  again. Same "best-effort, don't block the transaction" pattern as
  `docs/modules/identity-auth.md` should apply here once built.
- Frontend UI for registering/cancelling — API-only right now.
- "My registrations" list across all events for a user (currently only
  per-event lookup via `registrations/me`).
- Attendance tracking, building on the registration roster once it
  exists as real data to check people in against.
- Live "X spots left" on the public detail page — `capacity` is exposed
  but the registered count isn't, to keep the public unauthenticated
  route to a single query; a second count query is a small, deliberate
  follow-up rather than bundled in here.
