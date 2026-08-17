# Module 3c — Events Domain

Mirrors the News domain's structure and conventions exactly (content
management: create/update/publish/delete, public listing + detail pages).
Registration, attendance, and calendar/ICS export are deliberately
deferred to a later sub-slice — see `docs/modules/events.md` §8.

## ⚠️ Prerequisite

This assumes the **identity-hardening follow-up** package from last time
(`rasc-identity-hardening-followup`) is already applied — specifically
`database/migrations/0001_big_terrax.sql` and its snapshot. This package's
migration (`0002_normal_hemingway.sql`) is generated on top of that one.
If you haven't applied it yet, apply that package first.

## New files — copy as-is

```
backend/src/routes/events/create.ts
backend/src/routes/events/delete.ts
backend/src/routes/events/get.ts
backend/src/routes/events/index.ts
backend/src/routes/events/list.ts
backend/src/routes/events/publish.ts
backend/src/routes/events/update.ts
backend/src/schemas/events.ts
backend/src/services/events/events-service.ts
database/schema/events.ts
database/migrations/0002_normal_hemingway.sql
database/migrations/meta/0002_snapshot.json
docs/modules/events.md
frontend/app/(public)/events/page.tsx
frontend/app/(public)/events/[slug]/page.tsx
```

## Modified files — overwrite

```
backend/src/index.ts
database/schema/index.ts
database/migrations/meta/_journal.json
docs/07_User_Roles.md
```

## Delete these two (superseded, now dead)

```
backend/src/routes/events.ts   (empty stub — replaced by routes/events/ directory)
backend/src/routes/news.ts     (empty stub — replaced by routes/news/ directory;
                                 this one now actively breaks `tsc` once
                                 backend/src/index.ts imports `./routes/news`)
```

```bash
git rm backend/src/routes/events.ts backend/src/routes/news.ts
```

## Suggested commit

```bash
git add -A
git commit -m "Module 3c: Events domain (content management) + fix News schema export and missing route mount"
```

## What was verified before packaging

- `npx drizzle-kit generate` — clean diff, only the `events` table added.
- Applied to a fresh local D1 via `wrangler d1 execute DB --local` —
  confirmed table + indexes present.
- `npx tsc --noEmit` clean in both `backend/` and `frontend/`.
- `npx vitest run` — 24/24 passing (unchanged from before; Events has no
  new pure-logic unit tests, same as News — see `events.md` §7).
- Full end-to-end against a **live local Worker**: register → promote →
  login → create → reject invalid `endAt < startAt` (`400`) → draft
  hidden from public list/detail (`404`) → publish → visible on both
  public endpoints → partial update → soft-delete → confirmed gone from
  public list → update-nonexistent (`404`).
- Full-stack proof against a **live local Next.js dev server** on top of
  that same live Worker: a real published event, created through the real
  API, rendered correctly by the real `/events` and `/events/:slug` SSR
  pages — no mocked data anywhere in the chain.
- `next build` (production export) currently fails on the *homepage*
  (`/(public)/page`) with a Next.js internal invariant error
  (`clientReferenceManifest`). Confirmed this is **pre-existing** — it
  fails identically on a clean checkout with none of these changes
  applied, unrelated to Events. Worth investigating separately (possibly
  a Next.js/OpenNext version mismatch in this environment), but it did
  not block validating this module via `next dev`, which is what the
  project's actual workflow doc uses for local validation.

## Bugs found and fixed (pre-existing, not introduced by this change)

Both were only discovered because this work touched the same files —
flagged explicitly rather than folded in silently:

1. **`database/schema/index.ts` never re-exported `./news`.** The News
   service's `newsArticles` import through the schema barrel didn't
   typecheck. Fixed in the same edit that added `./events`.
2. **`backend/src/index.ts` defined `newsRoutes` but never mounted it.**
   `/api/news` was live nowhere — the entire News API was dead code. Fixed
   in the same edit that mounted `/api/events`.
3. **`docs/modules/news.md` §5 references a "News Domain" section in
   `docs/07_User_Roles.md` that was never written** — only "Identity
   Domain" existed there. Added both the News and Events tables in the
   same edit, since I was already adding Events' table there.

One thing intentionally **not** touched: `docs/17_Feature_Roadmap.md`'s
checkboxes are stale project-wide (even completed Identity/News items are
still unchecked) — that's a broader cleanup, not something to spot-fix
just for the Events line.

## Next step

Content management for Events is done and validated. The natural next
slice, per `docs/modules/events.md` §8, is **registration** — but that's a
new product decision (what fields does an RSVP need? capacity limits?
waitlisting?) worth confirming before I start guessing at a schema.
