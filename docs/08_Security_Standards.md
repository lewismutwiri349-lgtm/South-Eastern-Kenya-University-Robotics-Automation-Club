# 08 — Security Standards

Security is not a module — it is a constraint applied to every module. This
document is the checklist every feature is built against.

## 1. Authentication
- Passwords hashed with a modern algorithm (Argon2id preferred; bcrypt
  acceptable if platform constraints require it) — never reversible
  encryption, never plain text.
  - **Decision (2026-08-04, Identity module):** Argon2id requires WASM
    binaries loaded through Cloudflare's non-standard WASM import
    mechanism — every available implementation for Workers is fragile or
    requires manual WASM repackaging. Using **bcryptjs** (pure JS, no WASM)
    instead, per the platform-constraint exception this rule already
    anticipated. Cost factor set in the Identity module's implementation.
- Session tokens are short-lived, signed, stored in `httpOnly`, `Secure`,
  `SameSite=Lax` cookies — never in `localStorage` (XSS-exposed).
- Refresh tokens rotate on use; a used/replayed refresh token invalidates
  the whole session family (detects token theft).
  - **Decision (2026-08-04, Identity module, Login slice):** Implemented as
    a single D1-backed session token (not a separate access/refresh pair)
    per the project owner's explicit choice of "simple" session tracking.
    The token is a random 256-bit value, stored hashed, with a fixed 7-day
    expiry, revocable by deleting the row (logout) or its natural expiry.
    Dual-token rotation with family-based theft detection is a documented
    future upgrade if session hijacking risk assessment later calls for it
    — not built now to avoid unrequested complexity.
- Email verification required before an account can access Member/Applicant
  portal features (Visitor-level browsing is fine unverified).

## 2. Authorization
- Every API route declares its required role(s)/permission(s) explicitly —
  no implicit "if logged in, allow" logic.
- Authorization checks happen server-side on every request. The frontend
  hiding a button is a UX nicety, never a security boundary.
- **Privilege escalation prevention:** a user can never set or imply their
  own role/permissions in a request payload. Role changes only happen
  through dedicated admin-only endpoints, and every change is written to
  the audit log with actor, target, old value, new value, timestamp.
- **File access permissions:** R2 objects are never served from a public
  bucket path when they belong to non-public content — access is brokered
  through an authenticated API route that checks domain-level permission
  before issuing a signed/short-lived URL.

## 3. Input Validation
- Every API route validates its input against a schema (Zod) before any
  business logic runs. No exceptions.
- Validation errors return a consistent, structured error shape (defined in
  `docs/05_API_Standards.md`) — never leak stack traces or internal details.
- All file uploads validate: MIME type (checked against actual file
  content, not just extension), file size limit per type (see
  `docs/14_Performance_Standards.md`), and are scanned/sandboxed where
  feasible before being trusted.

## 4. Injection & Output Safety
- **SQL injection prevention:** all database access goes through Drizzle's
  parameterized query builder — no raw string-concatenated SQL, ever.
- **XSS prevention:** all user-generated content rendered in the frontend is
  escaped by default (React/Next.js does this automatically for text
  content — any use of `dangerouslySetInnerHTML` requires explicit
  sanitization via a vetted library and a documented reason).
- **Content Security Policy:** a strict CSP header is set on all frontend
  responses, disallowing inline scripts by default and restricting allowed
  script/style/image sources.

## 5. Transport & Network
- **CORS:** the backend API only accepts requests from explicitly
  whitelisted origins (production frontend domain, staging domain, local
  dev). No wildcard `*` origins on authenticated routes.
- **CSRF:** since auth uses cookies, state-changing routes (POST/PUT/PATCH/
  DELETE) require either a CSRF token or rely on `SameSite=Lax` cookies plus
  origin header verification as a second check.
- **Rate limiting:** applied per-IP and per-account on sensitive routes
  (login, password reset, registration, application submission) using
  Cloudflare's native rate limiting where possible.

## 6. Account Protection
- **Account lockout:** after a defined threshold of failed login attempts
  (exact number set in `docs/07_User_Roles.md` or a dedicated auth config),
  the account is temporarily locked and the owner notified.
- **Password policy:** minimum length and complexity enforced server-side
  (exact policy defined with the Auth module) — never client-side only.
- **Session expiration:** access tokens expire quickly (short window);
  refresh tokens expire after a defined inactivity period; all active
  sessions can be viewed and revoked by the account owner.

## 7. Audit & Monitoring
- All privilege changes, role assignments, project moderation actions
  (hide/flag/approve), and admin settings changes are written to an
  immutable audit log (actor, action, target, timestamp, before/after where
  relevant).
- Audit logs are readable by Super Admin only, and are never editable or
  deletable through the application layer.

## 8. Applied Per-Domain
This checklist applies to every domain in `docs/01_Product_Vision.md`.
When a module is built, its documentation package (per
`docs/13_Documentation_Standards.md`) must explicitly state which of these
controls apply and how.
