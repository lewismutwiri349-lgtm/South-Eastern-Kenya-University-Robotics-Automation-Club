# Identity Domain — Authentication & RBAC

## 1. Feature Overview
Registration, email verification, login/session management, password reset,
and role-based access control. This is the foundational domain every other
module depends on for knowing who's making a request and what they're
allowed to do.

## 2. Architecture
- `database/schema/identity.ts` — `users`, `sessions`,
  `email_verification_tokens`, `password_reset_tokens`,
  `identity_audit_logs`, `identity_rate_limits`.
- `backend/src/services/identity/` — business logic (password hashing,
  token generation/hashing, registration, login, session, password reset,
  email sending, failed-login/lockout policy, rate-limit policy, audit
  logging).
- `backend/src/middleware/` — `requireAuth` (session validation),
  `requireRole` (RBAC), and `identityRateLimit` (D1-backed per-IP limit on
  unauthenticated routes), composed per-route.
- `backend/src/routes/identity/` — thin handlers, one file per endpoint.
- D1-backed single-token sessions (not access/refresh pairs) — see
  `docs/08_Security_Standards.md` §1 for the rationale.
- Password hashing via bcryptjs (cost factor 12), not Argon2id — see
  `docs/08_Security_Standards.md` §1 for why (Argon2 needs non-standard
  WASM handling on Workers).

## 3. API
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/identity/register` | None | Rate-limited. Creates account (role: `applicant`), sends verification email (best-effort) |
| POST | `/api/identity/verify-email` | Valid token | Marks account verified |
| POST | `/api/identity/login` | Verified account | Rate-limited. Sets `httpOnly` session cookie. `429 ACCOUNT_LOCKED` after 5 failed attempts |
| POST | `/api/identity/logout` | Session | Revokes session, clears cookie |
| GET | `/api/identity/me` | Session | Returns current user |
| POST | `/api/identity/request-password-reset` | None | Rate-limited. Always returns generic response (no enumeration) |
| POST | `/api/identity/reset-password` | Valid token | Updates password, revokes all sessions |
| GET | `/api/identity/users` | `super_admin`, `chairperson`, `vice_chairperson`, `secretary` | Minimal roster; not paginated |

Response/error shapes follow `docs/05_API_Standards.md`. Rate-limited
routes return `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and
`X-RateLimit-Reset` headers, and `429 RATE_LIMITED` once exceeded (5
requests per 15-minute window, per IP, per route — see
`backend/src/middleware/identity-rate-limit.ts`).

## 4. Database
Six tables, all in `database/schema/identity.ts`. Every foreign key and
every `token_hash` column is indexed (added 2026-08-08 after being caught
missing during end-to-end validation — see §6). Sessions and tokens are
hard-deleted per `docs/04_Database_Design.md` §5.

- **`identity_audit_logs`** — append-only security record (`account_registered`,
  `email_verified`, `login_succeeded`, `login_failed`, `account_locked`,
  `logout`, `password_reset`). No credentials or raw tokens are ever
  written to it. Never updated or deleted by application code, per
  `docs/08_Security_Standards.md` §7.
- **`identity_rate_limits`** — fixed-window counters keyed on
  `(route, identifier_hash)`, where `identifier_hash` is a SHA-256 digest
  of the caller's IP — the raw IP is never persisted.
- **`users.failed_login_count` / `users.locked_until`** — added to support
  account lockout (`docs/08_Security_Standards.md` §6): 5 consecutive
  failed attempts locks the account for 15 minutes; a successful login
  resets the counter.

## 5. Permissions
See `docs/07_User_Roles.md` §4 for the full table. Key points: no implicit
Super Admin bypass — every role, including Super Admin, is explicitly
listed per route.

## 6. Edge Cases Handled
- **Email delivery failure doesn't block account creation.** Originally,
  registration and password-reset-request would fail with a 500 if the
  email provider was unreachable, *after* the database write had already
  committed — meaning the client saw a failure for an account that
  actually existed. Found during end-to-end validation (2026-08-08), fixed
  by treating email send as best-effort: caught, logged, and no longer
  blocks the response. See `registration-service.ts` and
  `password-reset-service.ts` for the reasoning inline.
- **Password reset revokes all sessions** for the account, so a stolen
  session can't survive the legitimate owner reclaiming their account.
- **Generic errors for credential/email-existence checks** — login never
  reveals whether the email or password was wrong; password-reset-request
  never reveals whether an email is registered.
- **Live role checks, not session-time snapshots** — a session's role is
  joined from the `users` table on every request, not cached at login. A
  role change (e.g. promotion) takes effect immediately on existing
  sessions without requiring re-login. Confirmed behaviorally during
  end-to-end testing (2026-08-08).
- **Account lockout after repeated failed logins** (2026-08-11) — 5
  consecutive failed attempts locks the account for 15 minutes
  (`login-policy.ts`). A locked account returns `429 ACCOUNT_LOCKED` even
  with the correct password, and every failed attempt, lockout, and
  successful login is written to `identity_audit_logs`.
- **Per-IP rate limiting on unauthenticated Identity routes** (2026-08-11)
  — `/register`, `/login`, and `/request-password-reset` are limited to 5
  requests per 15-minute window per IP (`identity-rate-limit.ts`,
  `rate-limit-policy.ts`), backed by D1 rather than Cloudflare's native
  rate limiting (deferred — see Future Improvements) so behavior is
  identical across local dev and production without extra platform
  configuration.

## 7. Tests
- Unit (Node-independent, colocated with source per the existing
  convention): `password.test.ts`, `tokens.test.ts`, `require-role.test.ts`,
  `login-policy.test.ts`, `rate-limit-policy.test.ts` — 20 tests, covering
  hashing correctness/randomness, token format/determinism, role-boundary
  logic, lockout-threshold behavior, and fixed-window rate-limit
  evaluation, all in isolation.
- Automated, against a real Workers runtime (2026-09-10) — `backend/`
  moved to Vitest 4 + `@cloudflare/vitest-pool-workers`
  (`backend/vitest.config.mts`), which runs every test inside Miniflare
  against a local D1 instance migrated with the same journal-tracked
  migrations production uses (deliberately not `readD1Migrations()` against
  the raw directory, which would also pick up the orphaned
  `0000_bitter_maximus.sql` — see §6). Lives in `backend/tests/` (a new
  convention for this project — root-level `tests/` per
  `docs/10_Testing_Standards.md` §5 isn't used, since these tests need
  direct access to `backend/`'s Worker bindings and source tree):
  - **Integration** (`tests/integration/identity/tables.test.ts`, 6 tests)
    — insert/select/update/delete against a real D1 instance for all six
    tables.
  - **API** (`tests/api/identity/*.test.ts`, 46 tests across 7 files) — one
    file per route, each covering its success path, validation failures,
    and (where applicable) unauthorized/business-failure/rate-limit cases,
    via `SELF.fetch()` through the real Hono app and its full middleware
    chain.
  - **Permission** (`tests/api/identity/list-users.test.ts`) — the full
    401/403/200 matrix from `docs/07_User_Roles.md` §4 for
    `/api/identity/users`, Identity's only `requireRole`-gated route: every
    denied role individually, every allowed role individually, plus
    unauthenticated.
  - 72 tests total, all passing. The Workers test pool does **not**
    isolate storage between individual tests in the same file (confirmed
    empirically — only between files), so every test that touches the
    database calls a shared `resetIdentityTables()` fixture first
    (`tests/helpers/identity-fixtures.ts`) rather than relying on
    insertion order.
  - `cloudflare:test`'s `env` is typed as the ambient, wrangler-generated
    `Cloudflare.Env`. This project hasn't adopted that generated-types
    convention (still `@cloudflare/workers-types` + `src/types/env.ts`),
    so test code casts once, centrally, in the fixtures/setup files rather
    than adopting `wrangler types` project-wide as an unrelated
    side effect of adding tests.
  - **Finding surfaced by writing these tests**: per-IP rate limiting (5
    req/15 min/route) and per-account lockout (5 failed attempts) interact
    — from a single IP, rate limiting always trips first, so
    `429 ACCOUNT_LOCKED` is only actually observable from a distributed
    (multi-IP) credential-stuffing attempt against one account. Arguably
    correct division of labor between the two defenses (each stops a
    different attack shape), but it wasn't stated anywhere before; the
    lockout test exercises it accordingly (varying IP per attempt).
- End-to-end (manual, against local D1, 2026-08-08): full register → verify
  → login-blocked-pre-verification → login → `/me` → RBAC-denied →
  RBAC-allowed-after-promotion → logout → session-actually-revoked flow,
  all verified against a real (locally persisted) D1 database and a live
  Worker process. Superseded by the automated API tests above for
  regression purposes; kept here as the historical record of the first
  validation pass.
- Migration validated (2026-08-14): `database/migrations/0001_big_terrax.sql`
  (adds `identity_audit_logs`, `identity_rate_limits`,
  `users.failed_login_count`, `users.locked_until`) generated via
  `npm run db:generate` and applied cleanly to a local D1 instance via
  `wrangler d1 execute DB --local`, alongside `0000_public_slyde.sql`.

## 8. Future Improvements
- Account-lockout owner notification email — `docs/08_Security_Standards.md`
  §6 calls for notifying the owner on lockout; not yet built.
- Cloudflare's native rate limiting as a defense-in-depth layer in front of
  the D1-backed check (the current implementation satisfies the
  requirement but doesn't stop requests at the edge).
- Periodic cleanup of expired `identity_rate_limits` rows (currently
  unbounded growth — low volume today, but worth a scheduled job before
  traffic increases).
- "Resend verification email" endpoint — the natural companion to making
  email delivery best-effort; a user whose verification email failed
  currently has no self-service way to retry.
- Real Resend sending domain (currently sandbox-only `from` address).
- Session listing / "revoke all other sessions" self-service UI.
