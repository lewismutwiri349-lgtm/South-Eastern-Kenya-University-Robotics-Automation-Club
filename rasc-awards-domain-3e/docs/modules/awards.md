# Awards Domain

## 1. Feature Overview
Public-facing awards/recognition listing and detail pages. Per
`docs/17_Feature_Roadmap.md`, this is explicitly **Phase 2 scope only** —
"Awards & Recognition (public view)". The full Awards System (badges,
certificates, Hall of Fame as a formal feature, Engineer/Project of the
Month nomination-and-approval workflows) is Phase 8 and deliberately not
built here — see §8.

Structurally this is the same content-management model as News, Events,
and Projects — not a badge/nomination system.

## 2. Architecture
- `database/schema/awards.ts` — `awards` table.
- `backend/src/services/awards/awards-service.ts` — create, update,
  publish, soft-delete, and cursor-paginated public listing.
- `backend/src/lib/slug.ts` — reused as-is, per
  `docs/02_Engineering_Principles.md` §2.
- `backend/src/routes/awards/` — one file per endpoint.
- `frontend/app/(public)/awards/` — public listing and detail pages.

## 3. API
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/awards` | None | Published only, cursor-paginated, ordered by `awardedAt` descending (most recently awarded first) |
| GET | `/api/awards/:slug` | None | Published only — `404` for drafts, not filtered silently |
| POST | `/api/awards` | `super_admin`, `chairperson`, `vice_chairperson`, `secretary`, `moderator` | Creates a draft. `recipientName` is free text (§4). `coverImageUrl` optional, must be a valid URL if present |
| PATCH | `/api/awards/:id` | Same | Partial update |
| POST | `/api/awards/:id/publish` | Same | Idempotent — republishing doesn't reset `publishedAt` |
| DELETE | `/api/awards/:id` | Same | Soft delete |

## 4. Database
`awards` — indexed on `slug` (unique), `author_id` (FK), and a composite
`(status, awarded_at)` index matching the real public-listing query.
Soft-deleted (`deleted_at`) per `docs/04_Database_Design.md` §5, same
rationale as News/Events/Projects.

Fields: `title`, `slug`, `description`, `recipient_name`, `category`
(nullable, free text), `awarded_at` (required — the date being
recognized for, distinct from `published_at`, same split as Events'
`start_at`), `cover_image_url` (nullable, same pattern as Projects'),
`author_id`, `status`, `published_at`, `deleted_at`, `created_at`,
`updated_at`.

**`recipient_name` is a free-text field, not a foreign key to `users`.**
This is a deliberate scope call, flagged rather than silently decided:
Phase 8 owns the actual nomination/approval workflow for things like
Engineer of the Month, and tying this to a real member record now would
mean inventing that relational structure ahead of that decision. A
recognition can also reasonably go to someone who isn't a system user at
all (an alum, an external judge's pick, etc.), which free text handles
without extra modeling. `category` is free text for the same reason — no
fixed set of award types has been decided yet.

## 5. Permissions
Same content-management role set as News, Events, and Projects — see
`docs/07_User_Roles.md` §4. No per-author ownership restriction, same
deliberate scope limit as the other content domains.

## 6. Edge Cases Handled
- **Drafts return 404, not an empty/filtered result** — same rationale as
  the other content domains.
- **Slug collisions** — disambiguated the same way (`-<6 hex chars>`
  suffix).
- **Invalid `coverImageUrl` rejected at the API boundary** (`400`, zod
  `.url()`).
- **Republishing is idempotent.**
- **Listing ordered by `awardedAt`, not `publishedAt`** — deliberately:
  an award entered into the system late (e.g. backfilling last year's
  Hall of Fame inductees) should appear in its actual chronological
  place among other recognitions, not jump to the top of the list just
  because it was published recently.

## 7. Tests
- End-to-end (manual, against local D1 + a live local Worker + a live
  Next.js dev server, 2026-08-16): full register → promote → login →
  unauthenticated create (`401`) → create → draft hidden from public
  list/detail (`404`) → publish → visible on both public endpoints →
  partial update → soft-delete → confirmed removed from public list. All
  passed on the first run. Then re-verified full-stack: a real published
  award, created through the real API, rendered correctly by the real
  `/awards` and `/awards/:slug` SSR pages via a real fetch to the real
  backend.
- No dedicated unit test file — same gap and same rationale as News,
  Events, and Projects; tracked project-wide in
  `docs/modules/identity-auth.md` §8.

## 8. Future Improvements
Everything Phase 8 explicitly owns, per `docs/17_Feature_Roadmap.md`, and
deliberately not pulled forward into this Phase 2 slice:
- Badges and certificates as real artifacts (not just a text
  description).
- Hall of Fame as a distinct, structured feature (currently just usable
  as a free-text `category` value on a generic award entry — same shape
  as any other recognition, no special treatment).
- Engineer of the Month / Project of the Month as actual nomination →
  review → approval workflows, rather than an admin directly typing in a
  recipient name and category.

Also open, not Phase-8-specific:
- Linking `recipientName` to a real `users` record when one exists,
  while still allowing free text for recipients who aren't system users
  — a hybrid model, not built now to avoid guessing at whether that
  distinction matters before Phase 8's workflow exists to populate it
  meaningfully.
- Admin authoring UI (the API exists; a form is Phase 6, Admin
  Dashboard).

## 9. Bugs Found During Validation (Pre-Existing, Not Introduced Here)
Same class of issue as News, Events, and Projects — flagged per
`docs/09_Development_Workflow.md` §5:
- An empty leftover stub file, `backend/src/routes/awards.ts`, predated
  the real `routes/awards/` directory. Removed proactively before it
  could break `tsc` (this is now the fourth time this exact pattern has
  shown up — News, Events, Projects, and Awards all had one. Worth a
  project-wide sweep for any other still-empty top-level stub files that
  will hit the same failure the moment their domain is built; see
  `docs/modules/projects.md` §9 and `docs/modules/events.md` §9 for the
  earlier three).
