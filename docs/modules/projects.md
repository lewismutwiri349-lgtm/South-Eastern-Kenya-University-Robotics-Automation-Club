# Projects Domain

## 1. Feature Overview
Public-facing project listing and detail pages. Per
`docs/17_Feature_Roadmap.md`, this is explicitly **Phase 2 scope only** —
"public-facing listing/detail views". Full project management
(drag-and-drop uploads for images/video/CAD/PDF/ZIP, version history,
search/filters/tags, GitHub link integration) is Phase 5 and deliberately
not built here — see §8.

Structurally this is a content-management model (create/edit/publish/
delete a piece of content with a public detail page), the same shape as
News, not a project-tracking system.

## 2. Architecture
- `database/schema/projects.ts` — `projects` table.
- `backend/src/services/projects/projects-service.ts` — create, update,
  publish, soft-delete, and cursor-paginated public listing.
- `backend/src/lib/slug.ts` — reused as-is, per
  `docs/02_Engineering_Principles.md` §2.
- `backend/src/routes/projects/` — one file per endpoint.
- `frontend/app/(public)/projects/` — public listing and detail pages.

## 3. API
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/projects` | None | Published only, cursor-paginated, newest-first by `publishedAt` |
| GET | `/api/projects/:slug` | None | Published only — `404` for drafts, not filtered silently |
| POST | `/api/projects` | `super_admin`, `chairperson`, `vice_chairperson`, `secretary`, `moderator` | Creates a draft. `coverImageUrl` optional, must be a valid URL if present |
| PATCH | `/api/projects/:id` | Same | Partial update |
| POST | `/api/projects/:id/publish` | Same | Idempotent — republishing doesn't reset `publishedAt` |
| DELETE | `/api/projects/:id` | Same | Soft delete |

## 4. Database
`projects` — indexed on `slug` (unique), `owner_id` (FK), and a composite
`(status, published_at)` index matching the real public-listing query.
Soft-deleted (`deleted_at`) per `docs/04_Database_Design.md` §5, same
rationale as News and Events.

Fields: `title`, `slug`, `summary`, `body`, `cover_image_url` (nullable —
a plain URL string, not a managed upload; see §8), `owner_id`, `status`,
`published_at`, `deleted_at`, `created_at`, `updated_at`.

`coverImageUrl` was a scope call, not something confirmed with Lewis
ahead of time — flagged here rather than silently included. Reasoning:
a bare project listing with no visual at all is thin to the point of
being not very useful, and a plain URL field costs nothing structurally
(no upload pipeline, no storage decision) while staying strictly within
Phase 2's "listing/detail views" framing. Phase 5's real upload pipeline
can populate this same field later without a schema change.

## 5. Permissions
Same content-management role set as News and Events — see
`docs/07_User_Roles.md` §4. No Projects-specific role (e.g. scoping edit
access to a project's actual owner/contributors) exists yet — same
deliberate scope limit as News and Events, not guessed at ahead of a
product decision.

## 6. Edge Cases Handled
- **Drafts return 404, not an empty/filtered result** — same rationale as
  News and Events.
- **Slug collisions** — disambiguated the same way (`-<6 hex chars>`
  suffix).
- **Invalid `coverImageUrl` rejected at the API boundary** (`400`, zod
  `.url()`) — not silently stored as-is.
- **Republishing is idempotent** — mirrors News/Events exactly.
- **Cursor pagination** — ordered by `(published_at, id)` descending
  (newest-first), same direction as News. Unlike Events, a project has no
  inherent "when" dimension to order by other than when it was published.

## 7. Tests
- End-to-end (manual, against local D1 + a live local Worker + a live
  Next.js dev server, 2026-08-15): full register → promote → login →
  create → reject invalid `coverImageUrl` (`400`) → draft hidden from
  public list/detail (`404`) → publish → visible on both public
  endpoints → partial update → confirmed reflected → soft-delete →
  confirmed removed from public list → update-nonexistent (`404`). Then
  re-verified full-stack: a real published project, created through the
  real API, rendered correctly by the real `/projects` and
  `/projects/:slug` SSR pages via a real fetch to the real backend.
- No dedicated unit test file — same gap and same rationale as News and
  Events (no branchy pure logic isolated from D1 access); tracked
  project-wide in `docs/modules/identity-auth.md` §8.

## 8. Future Improvements
Everything Phase 5 explicitly owns, per `docs/17_Feature_Roadmap.md`, and
deliberately not pulled forward into this Phase 2 slice:
- Real drag-and-drop file uploads (images, video, CAD, PDF, ZIP) — R2
  storage per `docs/03_Technical_Architecture.md`. `coverImageUrl` (§4)
  is the placeholder this will eventually populate.
- Version history.
- Search, filters, categories, tags.
- GitHub link integration.

Also open, not Phase-5-specific:
- Per-owner ownership restriction on edit/delete (same gap as News and
  Events).
- Multiple contributors per project (currently a single `owner_id`) —
  not guessed at without knowing whether "team project" attribution
  matters to how projects are displayed.
- Division association (`divisions` has no schema yet either — see
  `docs/17_Feature_Roadmap.md` Phase 2 note on Home/About/Divisions).
- Admin authoring UI (the API exists; a form is Phase 6, Admin
  Dashboard).

## 9. Bugs Found During Validation (Pre-Existing, Not Introduced Here)
Same class of issue as the two found while building Events (see
`docs/modules/events.md` §9) — flagged per
`docs/09_Development_Workflow.md` §5:
- An empty leftover stub file, `backend/src/routes/projects.ts`, predated
  the real `routes/projects/` directory and was never cleaned up. It
  actively broke `tsc` once `backend/src/index.ts` imported
  `./routes/projects` (same failure mode as the `news.ts`/`events.ts`
  stubs). Removed.
