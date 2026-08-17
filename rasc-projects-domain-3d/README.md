# Projects Domain — Phase 2 (Public Website)

Builds on the previous two packages (`rasc-events-domain-3c` and
`rasc-events-registration-3c2`) — applies on top of those. Independent of
Events otherwise (no shared tables/routes, same as News/Events).

## Why this, next

Per `docs/17_Feature_Roadmap.md`, after Events (content management +
registration), the next unchecked Phase 2 item is **"Projects
(public-facing listing/detail views)"**. I also updated the roadmap's
checkboxes in this package — Phase 0 and Phase 1 were fully built but
still showed unchecked, and Events now shows what's actually done vs.
deferred, instead of one flat unchecked line.

**Scope note**: "Attendance tracking" appears in the roadmap under both
Phase 2 (Events) and Phase 7 (Leadership Dashboard) — likely two
different things (per-event check-in vs. ongoing meeting/division
attendance). I didn't guess these are the same feature; both remain
open, flagged in `docs/modules/events.md` §11.

## New files — copy as-is

```
backend/src/routes/projects/create.ts
backend/src/routes/projects/delete.ts
backend/src/routes/projects/get.ts
backend/src/routes/projects/index.ts
backend/src/routes/projects/list.ts
backend/src/routes/projects/publish.ts
backend/src/routes/projects/update.ts
backend/src/schemas/projects.ts
backend/src/services/projects/projects-service.ts
database/schema/projects.ts
database/migrations/0004_peaceful_steve_rogers.sql
database/migrations/meta/0004_snapshot.json
docs/modules/projects.md
frontend/app/(public)/projects/page.tsx
frontend/app/(public)/projects/[slug]/page.tsx
```

## Modified files — overwrite

```
backend/src/index.ts               (mounts /api/projects)
database/schema/index.ts           (adds ./projects export)
database/migrations/meta/_journal.json
docs/07_User_Roles.md              (adds Projects Domain table)
docs/17_Feature_Roadmap.md         (checkboxes brought up to date)
```

## Delete this one (superseded, now dead)

```
backend/src/routes/projects.ts   (empty stub — same class of leftover
                                   file as the news.ts/events.ts ones
                                   from the last two packages; broke
                                   `tsc` once index.ts imported the real
                                   routes/projects/ directory)
```

```bash
git rm backend/src/routes/projects.ts
```

## Suggested commit

```bash
git add -A
git commit -m "Phase 2: Projects domain (public listing/detail) + roadmap accuracy pass"
```

## What was verified before packaging

- `npx drizzle-kit generate` — clean diff, only the `projects` table
  added.
- Applied to local D1 via `wrangler d1 execute DB --local`.
- `npx tsc --noEmit` clean in both `backend/` and `frontend/`.
- `npx vitest run` — 24/24 passing (unchanged; Projects has no new
  pure-logic unit tests, same rationale as News/Events).
- Full end-to-end against a live local Worker: register → promote →
  login → unauthenticated create (`401`) → create → draft hidden from
  public list/detail (`404`) → invalid `coverImageUrl` rejected (`400`)
  → publish → visible on both public endpoints → partial update →
  confirmed reflected → soft-delete → confirmed removed from public list
  → update-nonexistent (`404`). All passed.
- Full-stack proof against a live local Next.js dev server on top of that
  same Worker: a real published project rendered correctly by the real
  `/projects` and `/projects/:slug` SSR pages, no mocked data.

## One flagged, not-guessed-at design call

`coverImageUrl` (plain URL field, optional) isn't something confirmed
with you ahead of time — I made the call that a project listing needs
*some* visual to not feel thin, and a bare URL field costs nothing
structurally (no upload pipeline, no storage decision) while staying
inside Phase 2's "listing/detail views" framing. The real upload pipeline
is explicitly Phase 5 and can populate this same field later. Flagged in
`docs/modules/projects.md` §4 rather than silently included as if it were
obviously correct.

## Next step

Per the (now-accurate) roadmap, the next Phase 2 items are **Awards &
Recognition (public view)** and **Gallery, Resources, Contact** — both
straightforward content-management slices following the exact same
pattern as News/Events/Projects. Outside Phase 2, Phase 3 (Applicant
Portal) is a meaningfully different, larger body of work. Let me know
which direction, or say "proceed" to continue in roadmap order.
