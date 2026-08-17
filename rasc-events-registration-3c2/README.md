# Module 3c-2 — Event Registration & Waitlisting

Builds on the Events content-management slice (`rasc-events-domain-3c`
package) — applies that one first if you haven't already.

## Scope, as confirmed with Lewis before building

- Capacity limits + waitlisting: **in scope**.
- Who can register: **any authenticated user** — no role restriction.
- Cancellation: **self-service** — a user cancels their own registration;
  no organizer-removes-someone-else endpoint yet (see `events.md` §11).

## New files — copy as-is

```
backend/src/routes/events/register.ts
backend/src/routes/events/cancel-registration.ts
backend/src/routes/events/my-registration.ts
backend/src/routes/events/list-registrations.ts
backend/src/services/events/registration-service.ts
database/migrations/0003_violet_captain_cross.sql
database/migrations/meta/0003_snapshot.json
```

## Modified files — overwrite

```
backend/src/routes/events/index.ts       (mounts the 4 new routes)
backend/src/routes/events/get.ts         (public detail now includes `capacity`)
backend/src/routes/events/create.ts      (no functional change — same file, listed for completeness)
backend/src/services/events/events-service.ts   (createEvent now accepts capacity)
backend/src/schemas/events.ts            (capacity field + list-registrations query schema)
database/schema/events.ts                (events.capacity column + new event_registrations table)
database/migrations/meta/_journal.json
docs/07_User_Roles.md
docs/modules/events.md
```

## Suggested commit

```bash
git add -A
git commit -m "Module 3c-2: event registration with capacity + waitlisting"
```

## What was verified before packaging

- `npx drizzle-kit generate` — clean diff: new `event_registrations` table
  plus an `ALTER TABLE events ADD capacity` column, nothing else.
- Applied to a fresh local D1 via `wrangler d1 execute DB --local`.
- `npx tsc --noEmit` clean in `backend/` (frontend untouched this round —
  no UI for registration yet, API only).
- `npx vitest run` — 24/24 passing (unchanged; no new pure-logic unit
  tests, same rationale as the content-management slice — see
  `events.md` §10.5).
- Full end-to-end against a live local Worker, using a real
  `capacity: 2` event and three real accounts — **all 11 scenarios
  passed**:
  1. First two registrants → `registered`.
  2. Third → `waitlisted` (capacity full).
  3. Duplicate registration → `409 ALREADY_REGISTERED`.
  4. Own-status check → correct.
  5. Organizer roster view → all three rows, correct statuses.
  6. A `registered` user cancels → waitlisted user **auto-promoted** to
     `registered` in the same request.
  7. Cancelled user's own status → `cancelled`.
  8. That user re-registers → correctly `waitlisted` again.
  9. Cancelling an already-cancelled registration → `404`.
  10. Unauthenticated register attempt → `401`.
  11. Non-organizer viewing the roster → `403`.

## One known, flagged limitation — not silently accepted as fine

The capacity check in `registerForEvent` is **read-then-write, not
atomic**. Two genuinely concurrent registrations for the last open seat
could both read the same under-capacity count and both get seated,
overfilling by a small margin. Documented in `docs/modules/events.md`
§10.4 with the reasoning for not fixing it up front (club-scale traffic,
low actual collision risk, self-contained fix available later) rather
than either hiding it or over-engineering a locking scheme into this
slice. Tracked as a Future Improvement in §11.

## Next step

Registration is built and validated; there's no frontend UI for it yet
(register/cancel buttons on the event detail page) — API-only for now.
The module doc's Future Improvements list (`events.md` §11) has the
fuller list: organizer-initiated removal, promotion email notification,
"my registrations" cross-event view, and attendance tracking (which
depends on this roster existing as real data).
