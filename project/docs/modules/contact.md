# Contact — Phase 2 (Public Website)

## 1. Feature Overview

A public contact form at `/contact`. Anyone — no account needed — submits a
name, email, subject and message; the submission is stored and readable by
staff through a role-gated API endpoint, where it can be marked handled or
dismissed. The page also renders the club's direct contact details when
they are configured.

This is the only domain in the codebase where **the public writes and staff
read**, rather than the reverse. That inversion drives most of the design
decisions below.

## 2. Architecture

| Layer | Files |
|---|---|
| Schema | `database/schema/contact.ts` (re-exported from `database/schema/index.ts`) |
| Migration | `database/migrations/0006_cuddly_otto_octavius.sql` |
| Service | `backend/src/services/contact/contact-service.ts` |
| Validation | `backend/src/schemas/contact.ts` |
| Routes | `backend/src/routes/contact/` |
| Rate limiting | `backend/src/middleware/rate-limit.ts` (shared factory) |
| Mount | `backend/src/index.ts` → `/api/contact` |
| Frontend | `frontend/app/(public)/contact/page.tsx`, `frontend/components/ContactForm.tsx`, `frontend/lib/club-info.ts` |

New table: `contact_messages`.

## 3. API

| Method | Path | Auth | Notes |
|---|---|---|---|
| `POST` | `/api/contact` | **Public**, rate-limited | `201 { data: { id } }` |
| `GET` | `/api/contact` | Handler roles | Query: `limit` (1–50, default 20), `cursor`, `handled` (`unhandled` default, or `all`) |
| `POST` | `/api/contact/:id/handle` | Handler roles | Idempotent — re-handling keeps the original timestamp |
| `DELETE` | `/api/contact/:id` | Handler roles | Soft delete. `204`, no body |

Submit body: `name` (≤100), `email`, `subject` (≤200), `message` (≤5000).

There is deliberately **no public `GET` of any kind** — not by id, not by
slug. A contact message is never a public page.

## 4. Database

`contact_messages` differs from every other content table on purpose:

- **No `slug`, no `status`/`publishedAt` publish workflow.** A message has
  no public identity and nothing to publish. `handledAt` replaces the
  publish lifecycle: null means it still needs attention.
- **`submitterIpHash`, never a raw IP.** Enough to correlate repeat abuse
  from one source without retaining a raw identifier for an otherwise
  anonymous member of the public, per `docs/08_Security_Standards.md`. The
  service reuses Identity's `hashToken` (SHA-256) rather than introducing a
  second hashing helper, so there is exactly one hashing implementation in
  the codebase.
- **No foreign key to `users`.** A sender need not have an account — that is
  the entire point. There is an integration test asserting a message inserts
  successfully with zero user rows present.
- Soft-deleted via `deletedAt` per `docs/04_Database_Design.md` §5: a
  message dismissed by mistake should be recoverable.

Length ceilings on the Zod schema are tighter than the content domains'
because this is an unauthenticated write path — they are the primary defence
against one request filling D1 with a multi-megabyte body.

Indexes: `created_at` (the listing order) and `handled_at` (the unhandled
filter).

## 5. Permissions

| Route | Allowed roles |
|---|---|
| `POST /api/contact` | Anyone (unauthenticated), rate-limited |
| `GET /api/contact` | `super_admin`, `chairperson`, `vice_chairperson`, `secretary`, `moderator` |
| `POST /api/contact/:id/handle` | Same |
| `DELETE /api/contact/:id` | Same |

Same role set as the content domains — inbound enquiries are club
correspondence, and the Secretary/Chairperson line is who answers them.
Mirrored into `docs/07_User_Roles.md`.

The 401 leg of the `GET` permission test matters more here than anywhere
else in the codebase: the public can write to this table, so an accidental
public read would expose every sender's email address.

## 6. Edge Cases

- **Rate limiting is stricter than Identity's**: 5 per hour per IP, versus
  Identity's 5 per 15 minutes. A person contacting the club sends one
  message and waits; a failed login is plausibly retried several times in a
  row. Five per hour still allows an honest correction-and-resend without
  making the endpoint a usable spam channel.
- **The rate limiter is keyed on route path**, so the Contact window is
  independent of the Identity endpoints' windows — exhausting one does not
  affect the other. Tested.
- **The response never echoes the submitted content back** — only the id.
  The caller already has what they typed, and echoing user-supplied text is
  how a stored value becomes a reflected one. Pinned by a test asserting the
  response body has exactly one key.
- **`submitterIpHash` is never returned to staff.** It exists for abuse
  correlation inside the system, not for humans to read. Pinned by a test.
- **Handling is idempotent.** Re-marking an already-handled message keeps
  the original timestamp rather than resetting it, so "when was this dealt
  with?" stays answerable.
- **Rate-limited submitters get specific copy.** The form distinguishes a
  `429` from a generic failure — telling a rate-limited person to "try
  again" would just get them rate-limited again.
- **The form is a `<button onClick>`, not a `<form onSubmit>`.** Every
  submission posts JSON through `lib/api.ts` and never does a native form
  submission, so a real `<form>` would only add a full-page-navigation
  failure mode if the JS handler ever threw.

## 7. Club Contact Details — TRACKED FOLLOW-UP

`frontend/lib/club-info.ts` holds the club's email, location, meeting times
and social links. **These are deliberately blank, not placeholder values.**

Per `docs/00_Project_Constitution.md` §2 ("never fabricate", "no placeholder
or mock logic"), inventing an email address or a room number that looks real
is worse than showing nothing — a visitor would email into the void and
nobody would find out. The Contact page renders correctly in either state:
with no details set it collapses to a single-column form, and each detail
appears only once it is non-empty.

**Action required from the project owner:** fill in
`frontend/lib/club-info.ts`. No other code changes when you do.

## 8. Future Improvements

Deferred, not missing:

- **Admin triage UI** — Phase 6 (Admin Dashboard). Messages are currently
  readable through the API only. Assignment, threading and in-app replies
  all belong there, not here.
- **Email notification on new submission** — needs the Notifications domain
  and a decision about who gets notified; the Identity module's Resend
  integration is the obvious mechanism when that decision is made.
- **Auto-reply to the sender** — same dependency.
- **CAPTCHA / Turnstile** — rate limiting is the Phase 2 defence. If real
  spam volume appears, Cloudflare Turnstile is the natural next step and
  slots in ahead of the existing rate-limit middleware.

## 9. Known Naming Debt

The rate-limit backing table is still called `identity_rate_limits`
(`database/schema/identity.ts`) even though it is now a shared concern used
by Contact as well. The implementation moved from
`middleware/identity-rate-limit.ts` into a generic
`middleware/rate-limit.ts` factory when this module needed the same
mechanism at a different threshold; `identityRateLimit` is now built from
that factory and is behaviourally unchanged, which the pre-existing Identity
test suite verified.

The table is keyed by route path, so there is **no correctness problem** —
only a misleading name. Renaming it requires a migration, and a D1/SQLite
table rename is worth doing deliberately rather than as a side effect of
this module. Tracked here rather than silently left.
