# Awards & Recognition Domain — Phase 2 (Public Website)

Builds on the previous packages (`rasc-events-domain-3c`,
`rasc-events-registration-3c2`, `rasc-projects-domain-3d`) — independent
of them otherwise, same as News/Events/Projects (no shared tables/routes).

## Scope call, flagged not silent

`recipientName` is **free text**, not a link to a real `users` record.
Phase 8 owns the actual Awards System (badges, certificates, formal Hall
of Fame, Engineer/Project of the Month nomination workflows) — tying this
to a real member account now would mean inventing that relational
structure ahead of that decision, and a recognition can reasonably go to
someone who isn't a system user at all. Documented in
`docs/modules/awards.md` §4.

## New files — copy as-is

```
backend/src/routes/awards/create.ts
backend/src/routes/awards/delete.ts
backend/src/routes/awards/get.ts
backend/src/routes/awards/index.ts
backend/src/routes/awards/list.ts
backend/src/routes/awards/publish.ts
backend/src/routes/awards/update.ts
backend/src/schemas/awards.ts
backend/src/services/awards/awards-service.ts
database/schema/awards.ts
database/migrations/0005_icy_risque.sql
database/migrations/meta/0005_snapshot.json
docs/modules/awards.md
frontend/app/(public)/awards/page.tsx
frontend/app/(public)/awards/[slug]/page.tsx
```

## Modified files — overwrite

```
backend/src/index.ts               (mounts /api/awards)
database/schema/index.ts           (adds ./awards export)
database/migrations/meta/_journal.json
docs/07_User_Roles.md              (adds Awards Domain table)
docs/17_Feature_Roadmap.md         (Awards checkbox marked done)
```

## Delete this one (superseded, now dead)

```
backend/src/routes/awards.ts   (empty stub — same class of leftover file
                                 as news.ts/events.ts/projects.ts from
                                 the earlier packages)
```

```bash
git rm backend/src/routes/awards.ts
```

## Suggested commit

```bash
git add -A
git commit -m "Phase 2: Awards & Recognition domain (public view)"
```

## What was verified before packaging

- `npx drizzle-kit generate` — clean diff, only the `awards` table added.
- Applied to local D1 via `wrangler d1 execute DB --local`.
- `npx tsc --noEmit` clean in both `backend/` and `frontend/`.
- `npx vitest run` — 24/24 passing (unchanged; no new pure-logic unit
  tests, same rationale as the other content domains).
- Full end-to-end against a live local Worker — unauthenticated create
  (`401`) → create → draft hidden from public list/detail (`404`) →
  publish → visible on both public endpoints → partial update →
  soft-delete → confirmed removed from public list. All passed.
- Full-stack proof against a live local Next.js dev server: a real
  published award (title, recipient, category, description) rendered
  correctly by the real `/awards` and `/awards/:slug` SSR pages.

## A pattern worth a proactive check

This is the fourth domain in a row (News, Events, Projects, Awards) where
an empty leftover stub route file predated the real route directory and
had to be found and removed before `tsc` would pass once it got imported.
I checked for `awards.ts` proactively this time rather than hitting it by
surprise. The remaining untouched stub files —
`backend/src/routes/{admin,analytics,applicants,auth,certificates,
dashboard,divisions,users}.ts` — are all still empty and harmless *until*
each of those domains gets built and actually imports its real route
directory, at which point the same failure will happen again. Worth
knowing about, not worth fixing preemptively (they're currently inert).

## Next step

Per the roadmap, the last Phase 2 item is **Gallery, Resources, Contact**
— likely three small, mostly-static pieces rather than one more full
content-management domain (worth confirming shape before building,
since "Gallery" in particular could mean anything from a static image
grid to another full upload-backed domain). After that, Phase 2 is fully
closed out and the next real decision is which of Phase 3 (Applicant
Portal), Phase 4 (Member Portal), or Phase 6 (Admin Dashboard) to tackle
next — each a meaningfully larger, different body of work than what's
been built so far.
