# 10 — Testing Standards

"Add tests" is not a standard. This document defines exactly what must be
tested, at what layer, and when.

## 1. Test Categories & What They Cover

| Category | Covers | Runs |
|---|---|---|
| **Unit** | Individual service functions, pure logic, validation schemas | Every PR, fast (<1s per test) |
| **Integration** | Service + real (local) D1 database interaction | Every PR |
| **API** | Full request/response cycle through Hono routes, including middleware | Every PR |
| **Authentication** | Login, session issuance/expiry, refresh rotation, lockout | Every PR touching Identity domain |
| **Permission** | Every role/permission boundary — verifying denied roles are actually denied, not just that allowed roles succeed | Every PR touching an authorization check |
| **Regression** | Previously fixed bugs get a permanent test so they can't silently return | Added when a bug is fixed |
| **UI** | Component rendering, user interaction flows (React Testing Library) | Every PR touching frontend components |
| **Accessibility** | Keyboard navigation, ARIA labeling, color contrast on key flows | Every PR touching new UI, spot-checked |
| **Performance** | API latency budgets (see `docs/14_Performance_Standards.md`) on critical routes | Before release, and when a route's logic changes materially |

## 2. Minimum Bar Per Module
A module cannot be marked complete without:
- [ ] Unit tests for every service function containing business logic
- [ ] At least one integration test per new database table's core CRUD path
- [ ] At least one API test per new route, covering: success path, validation
      failure, and unauthorized access attempt
- [ ] Permission tests for every role boundary the module introduces
- [ ] UI tests for any new interactive component (forms, dashboards, uploads)

## 3. What "Permission Test" Means Concretely
For every protected route, tests must assert:
1. An unauthenticated request is rejected (401)
2. An authenticated request from a role **without** permission is rejected (403)
3. An authenticated request from a role **with** permission succeeds (200/201)

This is non-negotiable for anything touching Identity, Membership,
Administration, or Projects moderation — these are the domains where a
missed permission check has real consequences.

## 4. Test Data
- Tests use seeded, deterministic fixture data — never depend on
  production-like or random data that could make failures flaky.
- No test hits a real external service (email, third-party API) — these are
  mocked at the boundary.

## 5. Where Tests Live
```
tests/
├── unit/<domain>/
├── integration/<domain>/
├── api/<domain>/
└── e2e/                  # Cross-domain user flows (e.g. full application → interview flow)
```
Frontend component tests live alongside components:
`frontend/components/<Component>/<Component>.test.tsx`

## 6. Definition of "Adequately Tested"
Not a coverage percentage — a functional bar: every business rule stated in
a module's documentation (per `docs/13_Documentation_Standards.md`) has a
corresponding test that would fail if that rule were violated.
