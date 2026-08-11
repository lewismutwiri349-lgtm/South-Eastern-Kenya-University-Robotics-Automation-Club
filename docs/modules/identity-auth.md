# Identity Domain — Authentication & RBAC

## 1. Feature Overview
Registration, email verification, login/session management, password reset,
and role-based access control. This is the foundational domain every other
module depends on for knowing who's making a request and what they're
allowed to do.

## 2. Architecture
- `database/schema/identity.ts` — `users`, `sessions`,
  `email_verification_tokens`, `password_reset_tokens`.
- `backend/src/services/identity/` — business logic (password hashing,
  token generation/hashing, registration, login, session, password reset,
  email sending).
- `backend/src/middleware/` — `requireAuth` (session validation) and
  `requireRole` (RBAC), composed per-route.
- `backend/src/routes/identity/` — thin handlers, one file per endpoint.
- D1-backed single-token sessions (not access/refresh pairs) — see
  `docs/08_Security_Standards.md` §1 for the rationale.
- Password hashing via bcryptjs (cost factor 12), not Argon2id — see
  `docs/08_Security_Standards.md` §1 for why (Argon2 needs non-standard
  WASM handling on Workers).

## 3. API
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/identity/register` | None | Creates account (role: `applicant`), sends verification email (best-effort) |
| POST | `/api/identity/verify-email` | Valid token | Marks account verified |
| POST | `/api/identity/login` | Verified account | Sets `httpOnly` session cookie |
| POST | `/api/identity/logout` | Session | Revokes session, clears cookie |
| GET | `/api/identity/me` | Session | Returns current user |
| POST | `/api/identity/request-password-reset` | None | Always returns generic response (no enumeration) |
| POST | `/api/identity/reset-password` | Valid token | Updates password, revokes all sessions |
| GET | `/api/identity/users` | `super_admin`, `chairperson`, `vice_chairperson`, `secretary` | Minimal roster; not paginated |

Response/error shapes follow `docs/05_API_Standards.md`.

## 4. Database
Four tables, all in `database/schema/identity.ts`. Every foreign key and
every `token_hash` column is indexed (added 2026-08-08 after being caught
missing during end-to-end validation — see §6). Sessions and tokens are
hard-deleted per `docs/04_Database_Design.md` §5.

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

## 7. Tests
- Unit: `password.test.ts`, `tokens.test.ts`, `require-role.test.ts` — 12
  tests, all passing, covering hashing correctness/randomness, token
  format/determinism, and role-boundary logic in isolation.
- End-to-end (manual, against local D1, 2026-08-08): full register → verify
  → login-blocked-pre-verification → login → `/me` → RBAC-denied →
  RBAC-allowed-after-promotion → logout → session-actually-revoked flow,
  all verified against a real (locally persisted) D1 database and a live
  Worker process. Not yet automated — see Future Improvements.

## 8. Future Improvements
- Automated integration/API tests against a local D1 test harness (manual
  end-to-end testing substituted for this so far — a real gap against
  `docs/10_Testing_Standards.md`).
- Rate limiting on `/login`, `/register`, and especially
  `/request-password-reset` (the highest-risk unauthenticated endpoint) —
  deferred, not yet built.
- "Resend verification email" endpoint — the natural companion to making
  email delivery best-effort; a user whose verification email failed
  currently has no self-service way to retry.
- Real Resend sending domain (currently sandbox-only `from` address).
- Session listing / "revoke all other sessions" self-service UI.
