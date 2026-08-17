# Identity Hardening Follow-up — Files to Apply

This closes out the work Codex left mid-flight in the "backed" commit
(rate limiting, account lockout, audit logging on the Identity domain).
The code itself was already correct and untouched — what was missing was
the generated migration and the module doc update. Both are in this drop.

## What to do

Copy these into your repo, overwriting the existing files at the same
paths:

```
database/migrations/0001_big_terrax.sql          (new file)
database/migrations/meta/0001_snapshot.json       (new file)
database/migrations/meta/_journal.json            (overwrite)
docs/modules/identity-auth.md                     (overwrite)
```

Then commit as a normal follow-up, e.g.:

```
git add database/migrations/0001_big_terrax.sql \
        database/migrations/meta/0001_snapshot.json \
        database/migrations/meta/_journal.json \
        docs/modules/identity-auth.md
git commit -m "Close out identity hardening: generate migration, update module docs"
```

## What was verified before packaging

- `npx drizzle-kit generate` run from `database/` against the current
  `database/schema/*.ts` — diffed cleanly against the journal-tracked
  baseline (`0000_public_slyde`), producing `0001_big_terrax.sql`
  (`identity_audit_logs`, `identity_rate_limits`,
  `users.failed_login_count`, `users.locked_until`, plus `news_articles`,
  which — see flag #1 below — had never actually been migrated either).
- Both `0000_public_slyde.sql` and `0001_big_terrax.sql` applied cleanly
  to a fresh local D1 instance via `wrangler d1 execute DB --local`. All
  six expected tables and the two new `users` columns are present
  afterward.
- Full backend test suite: `npx vitest run` — **24/24 passing**, including
  the new `login-policy.test.ts` and `rate-limit-policy.test.ts` Codex
  added in the same commit.
- `docs/modules/identity-auth.md` updated: new tables documented, API
  table now notes rate-limit headers/`429` responses, Edge Cases section
  covers lockout and per-IP limiting, Tests section reflects the new
  20-unit-test count and the migration validation, and the "rate
  limiting... deferred" line in Future Improvements is replaced with what
  actually shipped plus the follow-ups it exposed (see below).

## Two issues flagged, not fixed

Per your constitution's §2 rule ("bugs in *previously completed* modules
are not silently fixed as a side effect — they're flagged"), I left these
alone rather than patching them into this change set:

1. **`database/schema/index.ts` never re-exports `./news`.** It only has
   `export * from "./identity"`. `backend/src/services/news/news-service.ts`
   imports `newsArticles` from the barrel (`../../../../database/schema`),
   so `npx tsc --noEmit` in `backend/` currently fails with one error:
   `Module has no exported member 'newsArticles'`. This is a News-domain
   (Module 3b) bug, unrelated to the identity work — one-line fix
   (`export * from "./news";`) whenever you want it scoped as a hotfix.

2. **`database/migrations/0000_bitter_maximus.sql` is an orphaned file.**
   It's not referenced anywhere in `meta/_journal.json` (only
   `0000_public_slyde` is), so `drizzle-kit` never sees or applies it.
   It happens to contain a `news_articles` table definition that duplicates
   what's now correctly tracked in `0001_big_terrax.sql`. It looks like a
   leftover from an earlier `generate` run that never got wired into the
   journal. Safe to delete, but I left it since removing files wasn't part
   of the requested scope.

Also worth noting: `docs/08_Security_Standards.md` §6 calls for notifying
the account owner on lockout — not built yet, now tracked explicitly in
`identity-auth.md` §8 Future Improvements rather than left implicit.

## Next step

With this applied, Module 2's Identity domain (including the hardening
pass) is fully closed out — code, migration, and docs all in sync. The
next planned work per your roadmap is **Module 3c (Events domain)** — no
backend/frontend implementation exists for it yet, only an empty
`backend/src/routes/events.ts` stub. Say the word and I'll scope that out
properly (schema → service → route → frontend, per your Development
Workflow doc) rather than starting it inside this same change set.
