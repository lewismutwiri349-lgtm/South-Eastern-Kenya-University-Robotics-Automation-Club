# Admin Dashboard — Phase 6, Slice 1 (User & Applicant Management)

## 1. Feature Overview

The Administration domain, per `docs/01_Product_Vision.md`'s domain table
("User management, moderation, division/news/event management, system
settings, audit logs"). This is the first slice of Phase 6: staff can see
the full user roster (search/filter, grant roles), and review interviewed
applicants (accept → promotes to member, or reject).

Not built in this slice, and why: project moderation, division management,
content moderation surfaces, reports/analytics, and system settings are
each their own sub-module (see docs/17_Feature_Roadmap.md). Certificate
management, though listed under Phase 6 there, is explicitly deferred to
Phase 8 per `database/schema/awards.ts`'s own comment and
`docs/modules/awards.md` — that conflict was flagged and resolved with the
project owner before this slice started. Division management needs a new
data model decision (there is currently no `divisions` table — "division"
is only a free-text preference field) and was deliberately held back rather
than guessed at.

## 2. Architecture

| Layer | Files |
|---|---|
| Schema | `database/schema/administration.ts` (re-exported from `database/schema/index.ts`) |
| Migration | `database/migrations/0011_admin_dashboard.sql` (hand-written — see §6) |
| Services | `backend/src/services/admin/audit-service.ts`, `user-management-service.ts`, `applicant-management-service.ts` |
| Validation | `backend/src/schemas/admin.ts` |
| Routes | `backend/src/routes/admin/` |
| Mount | `backend/src/index.ts` → `/api/admin` |
| Frontend | `frontend/app/admin/`, `frontend/lib/admin-api.ts` |

New table: `admin_audit_logs` — deliberately separate from
`identity_audit_logs`, which stays scoped to Identity security events
(login, password reset, email verification). Administration owns its own
audit trail per the vision doc, and future project/content moderation
actions will log to this same table.

Unlike Applications and Members (which use raw D1 `.prepare()`/`.bind()`),
this domain uses Drizzle throughout, since that's what
`docs/12_Coding_Standards.md` §2 specifies and what most domains
(Contact, News, Events, Projects) actually follow — the raw-D1 domains are
the exception, not the pattern to extend.

## 3. API

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/api/admin/users` | Admin-staff roles | Query: `limit` (1–50, default 20), `cursor`, `role`, `q` (name/email substring) |
| `PATCH` | `/api/admin/users/:id/role` | Role-granter roles | Body: `{ role }`. `403` if the target is the caller |
| `GET` | `/api/admin/applications` | Admin-staff roles | Query: `limit`, `cursor`, `status` |
| `GET` | `/api/admin/applications/:id` | Admin-staff roles | Any applicant's application, not just the caller's own |
| `POST` | `/api/admin/applications/:id/accept` | Admin-staff roles | `409` unless status is `interviewed` |
| `POST` | `/api/admin/applications/:id/reject` | Admin-staff roles | Body: `{ reason? }`. `409` unless status is `interviewed` or `test_failed` |

`GET /api/identity/users` (the older, minimal roster route) is left in
place — removing it wasn't part of this slice.

## 4. Permissions

| Route | Allowed roles |
|---|---|
| `GET /api/admin/users` | `super_admin`, `chairperson`, `vice_chairperson`, `secretary` |
| `PATCH /api/admin/users/:id/role` | `super_admin`, `chairperson` |
| `GET/POST /api/admin/applications*` | `super_admin`, `chairperson`, `vice_chairperson`, `secretary` |

Role-granting is deliberately narrower than roster visibility: assigning a
role (treasurer, division_head, moderator, etc.) is a governance decision,
not routine admin work. Secretary is included in the wider set because
`docs/07_User_Roles.md` names "membership administration" as part of that
role — this is literally reviewing applicants. Mirrored into
`docs/07_User_Roles.md`.

An actor can never change their own role via this endpoint (`403`) — a
guard against accidental self-lockout, checked against the authenticated
session, not a client-supplied field.

## 5. Business Rules — Explicit Assumptions

Two decisions were made without an explicit requirement from the project
owner, per `docs/18_AI_Operating_Manual.md` §2 ("pick the most reasonable
interpretation... for anything affecting data model or permissions, ask
first" — these affect behaviour, not the data model, so documented here
rather than blocking on them):

- **Accepting an application also creates the member profile row**
  (`member_profiles`, via `member-service.ts`'s `createMemberProfile`) and
  promotes the account's role to `member`, using the application's
  `divisionPreferencePrimary` as the initial division. Without this, a
  newly-accepted member would hit a `404` on `GET /api/members/me` — see
  `backend/src/routes/members/index.ts`, which does not auto-create a
  profile.
- **Rejection is allowed from two statuses**: `interviewed` (the normal
  case) and `test_failed` (rejecting without an interview, for a clear
  aptitude-test failure). Acceptance is only ever from `interviewed`.

## 6. Migration Tooling Note

`drizzle-kit generate` in this repo is unreliable right now: its journal
(`database/migrations/meta/_journal.json`) stops at `0006`, but migrations
`0007`–`0010` were added later as hand-written raw SQL for tables Drizzle
doesn't manage (see `backend/vitest.config.mts`'s comment on
`HAND_WRITTEN_MIGRATIONS` — this was already a known, deliberate pattern
before this slice, not something discovered here). Running `generate`
against the stale journal produces a migration that tries to re-create
tables that already exist.

`0011_admin_dashboard.sql` was therefore hand-written (just the one new
`admin_audit_logs` table) rather than generated, and added to
`HAND_WRITTEN_MIGRATIONS` in `backend/vitest.config.mts` alongside
`0007`–`0010`. **Follow-up worth doing deliberately, not as a side effect of
a future module**: reconcile the journal/snapshots so `generate` works
again — likely via `drizzle-kit introspect` against the real schema, or by
hand-writing the missing snapshot files for 0007–0010. Not attempted here
since it touches migration metadata for tables outside this domain.

## 7. Testing

`backend/tests/helpers/admin-fixtures.ts`, `backend/tests/api/admin/`. Both
routes have the full 401/403/200 permission-boundary coverage
`docs/10_Testing_Standards.md` requires, plus: search/filter correctness,
password-hash exclusion, role-change idempotency, the self-role-change
guard, both application status-transition guards, and the
accept-creates-member-profile side effect.

## 8. Future Work

Deferred, not missing — each is its own Phase 6 sub-module:

- **Project moderation** (flag/hide/approve/request changes)
- **Divisions** — needs a data-model decision (a new `divisions` table)
  before it can be built; not guessed at here
- **News/Event/Award admin surfaces** — the CRUD APIs already exist for
  content-management roles; this is a frontend-only gap
- **Reports, analytics, audit log viewer, system settings**
- **Certificate management** — Phase 8, per `docs/modules/awards.md`
