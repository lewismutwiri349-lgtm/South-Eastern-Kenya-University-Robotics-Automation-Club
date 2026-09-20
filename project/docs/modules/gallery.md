# Gallery — Phase 2 (Public Website)

## 1. Feature Overview

A public photo gallery. Staff with a content-authoring role create gallery
items (a title, a caption, an image URL, an optional category and the date
the photo was taken), publish them, and visitors browse them as a grid at
`/gallery`, filterable by category, with a permalink detail page per item.
Items are drafts until explicitly published and are never visible to the
public before that.

## 2. Architecture

Follows the same shape as News, Events, Projects and Awards, per
`docs/03_Technical_Architecture.md` §6 — no new layers or patterns
introduced.

| Layer | Files |
|---|---|
| Schema | `database/schema/gallery.ts` (re-exported from `database/schema/index.ts`) |
| Migration | `database/migrations/0006_cuddly_otto_octavius.sql` |
| Service | `backend/src/services/gallery/gallery-service.ts` |
| Validation | `backend/src/schemas/gallery.ts` |
| Routes | `backend/src/routes/gallery/` (one file per operation, composed in `index.ts`) |
| Mount | `backend/src/index.ts` → `/api/gallery` |
| Frontend | `frontend/app/(public)/gallery/page.tsx`, `frontend/app/(public)/gallery/[slug]/page.tsx` |

New table: `gallery_items`. No shared tables with any other domain.

## 3. API

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/api/gallery` | Public | Published items only, newest `capturedAt` first. Query: `limit` (1–50, default 24), `cursor`, `category` |
| `GET` | `/api/gallery/categories` | Public | Distinct categories across published items, sorted |
| `GET` | `/api/gallery/:slug` | Public | Published items only; a draft returns `404` |
| `POST` | `/api/gallery` | Author roles | Creates a draft. `201 { data: { id, slug } }` |
| `PATCH` | `/api/gallery/:id` | Author roles | Partial update |
| `POST` | `/api/gallery/:id/publish` | Author roles | Idempotent; keeps the original `publishedAt` on re-publish |
| `DELETE` | `/api/gallery/:id` | Author roles | Soft delete. `204`, no body |

Create/update body: `title`, `caption`, `imageUrl` (must be a valid URL),
`category` (optional), `capturedAt` (ISO date).

Pagination is cursor-based per `docs/05_API_Standards.md` §4, encoding
`(capturedAt, id)` so ordering stays stable when two photos share a capture
date.

**Route order is load-bearing.** `/categories` is registered before
`/:slug` in `backend/src/routes/gallery/index.ts`. Reversing that makes
`/api/gallery/categories` resolve as an item whose slug is "categories" and
return `404`. There is a regression test pinning this
(`backend/tests/api/gallery/gallery.test.ts`).

## 4. Database

`gallery_items` — columns and their rationale:

- `imageUrl` is **a plain URL, not a managed upload**. The real upload
  pipeline (drag-and-drop, R2 storage, size/type limits, virus scanning) is
  explicitly Phase 5, and `docs/03_Technical_Architecture.md` §8 lists the
  file-storage decision as deliberately deferred. Building an upload-backed
  gallery now would force that decision early and out of order. This matches
  the precedent already set by `projects.coverImageUrl` and
  `awards.coverImageUrl`. When Phase 5 lands it writes R2 URLs into this
  same column — no migration needed for existing rows.
- `category` is free text, nullable, not an enum. The club's own
  categorisation ("Competition", "Workshop", "Build Log") will change faster
  than a schema should, and an uncategorised photo is still a valid entry.
- `capturedAt` is separate from `publishedAt`. A photo uploaded months after
  the event belongs in its real chronological place in the grid, not at the
  top just because it was entered recently — the same domain-date-vs-publish-date
  split as Events' `startAt` and Awards' `awardedAt`.
- Soft-deleted via `deletedAt` per `docs/04_Database_Design.md` §5.

Indexes match the actual queries: unique on `slug`, plain on `author_id`,
and a composite on `(status, captured_at)` for the public listing.

## 5. Permissions

| Route | Allowed roles |
|---|---|
| `GET /api/gallery` | Anyone (unauthenticated) |
| `GET /api/gallery/categories` | Anyone (unauthenticated) |
| `GET /api/gallery/:slug` | Anyone (unauthenticated) |
| `POST /api/gallery` | `super_admin`, `chairperson`, `vice_chairperson`, `secretary`, `moderator` |
| `PATCH /api/gallery/:id` | Same |
| `POST /api/gallery/:id/publish` | Same |
| `DELETE /api/gallery/:id` | Same |

Same content-management role set as News, Events, Projects and Awards.
Mirrored into `docs/07_User_Roles.md`.

## 6. Edge Cases

- **Duplicate titles.** Two items titled the same produce the same base
  slug; `disambiguateSlug` appends a suffix. Enforced additionally by a
  unique index, so a race between two concurrent creates fails loudly rather
  than silently overwriting.
- **A draft's slug is guessable.** Requesting an unpublished item's slug
  returns `404`, not `403` — a `403` would confirm the item exists and make
  unpublished content discoverable by guessing.
- **Category filter on a category that only exists on drafts.** Returns an
  empty list, and the category never appears in `/categories` at all, since
  that endpoint filters to published rows.
- **Deleting an already-deleted item** returns `404` rather than a second
  `204`, because the service looks up the row with `deletedAt IS NULL`.
- **`/categories` computes rather than stores.** A separate categories table
  would need its own CRUD and would drift out of sync with what is actually
  in use. This assumes hundreds of rows, not millions; if that ever breaks,
  `listPublishedGalleryCategories` is the single function to revisit.
- **External image hosts.** The frontend uses a plain `<img>`, not
  `next/image`: these are arbitrary external URLs, and `next/image` would
  require whitelisting every possible host in `next.config.js`. Phase 5's
  move to R2 gives a single known host, at which point `next/image` becomes
  the right call.

## 7. Tests

- `backend/tests/integration/content/tables.test.ts` — `gallery_items` CRUD
  against real local D1, including the draft-by-default column value, the
  soft-delete path, and unique-slug enforcement.
- `backend/tests/api/gallery/gallery.test.ts` — 29 tests covering every
  route: success path, validation failure, and the full 401/403/200
  permission matrix per `docs/10_Testing_Standards.md` §3. Also covers
  cursor pagination, category filtering, draft invisibility, and the
  `/categories`-before-`/:slug` mount-order regression.

## 8. Future Improvements

Deferred, not missing:

- **R2-backed uploads** — Phase 5. Replaces staff pasting a URL with a real
  upload, writing into the existing `imageUrl` column.
- **Image thumbnails / responsive sizes** — depends on the above; there is
  no point generating derivatives of URLs on hosts we don't control.
- **Admin UI for authoring** — Phase 6 (Admin Dashboard). Items are
  currently created through the API only.
- **Bulk upload** — an explicit non-goal for Phase 2; belongs with the
  Phase 5 upload pipeline.
