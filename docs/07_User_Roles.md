# 07 — User Roles & RBAC

## 1. Authoritative Role List
Matches `docs/00_Project_Constitution.md` §4 and `database/schema/identity.ts`:

| Role | Stored value | Description |
|---|---|---|
| Super Admin | `super_admin` | Full system access; technical/platform owner. Not automatically all-powerful in code — see §3. |
| Chairperson | `chairperson` | Club's top elected leadership role. |
| Vice Chairperson | `vice_chairperson` | Deputy to the Chairperson. |
| Secretary | `secretary` | Records, membership administration, communications. |
| Treasurer | `treasurer` | Financial oversight (scope defined when a Finance domain, if any, is built). |
| Division Head | `division_head` | Leads a technical division (e.g. Avionics, Software). |
| Project Leader | `project_leader` | Leads an individual project within a division. |
| Moderator | `moderator` | Content moderation (projects, news, comments) without full admin access. |
| Member | `member` | Standard active club member. |
| Applicant | `applicant` | Registered but not yet an approved member — default role on registration (confirmed 2026-08-04). |
| Visitor | *(no row)* | Unauthenticated browser. Not a database value — the absence of a session. |

## 2. Enforcement Mechanism
Two composable middlewares, used together on every protected route:
- **`requireAuth`** — verifies the session cookie, attaches `userId` and `role`
  to the request context (single joined query, per
  `docs/14_Performance_Standards.md`'s no-N+1 rule).
- **`requireRole(...allowedRoles)`** — checks the role already in context
  against an explicit allow-list declared at the route. Must run after
  `requireAuth`.

```ts
route.get("/admin-only", requireAuth, requireRole("super_admin", "chairperson"), handler);
```

## 3. No Implicit Super Admin Bypass
`requireRole` does **not** automatically grant Super Admin universal access
— Super Admin must be explicitly listed in a route's allowed roles, same as
any other role. This was a deliberate choice, not an oversight: it matches
`docs/08_Security_Standards.md` §2 ("every route declares its required
role(s) explicitly... no implicit... logic"). A hidden bypass is exactly
the kind of implicit rule that document forbids, even when the bypassed
role is the most trusted one. In practice, Super Admin is included in the
allow-list of nearly every sensitive route, but that inclusion is visible
in the code, not assumed.

## 4. Per-Domain Permission Matrices
This document defines the role list and the enforcement mechanism — it
deliberately does **not** enumerate a full permission matrix for domains
that don't exist yet (Projects, Events, Awards, etc.). Speculating about
permissions for unbuilt features would mean guessing, which
`docs/18_AI_Operating_Manual.md` §6 forbids. Each domain's module
documentation (`docs/13_Documentation_Standards.md` §1, "Permissions"
section) states exactly which roles can do what within that domain, as
that domain is actually built.

### Identity Domain (current)
| Route | Allowed roles |
|---|---|
| `POST /api/identity/register` | Anyone (unauthenticated) |
| `POST /api/identity/verify-email` | Anyone with a valid token |
| `POST /api/identity/login` | Anyone (unauthenticated) |
| `POST /api/identity/logout` | Any authenticated user |
| `GET /api/identity/me` | Any authenticated user |
| `POST /api/identity/request-password-reset` | Anyone (unauthenticated) |
| `POST /api/identity/reset-password` | Anyone with a valid token |
| `GET /api/identity/users` | `super_admin`, `chairperson`, `vice_chairperson`, `secretary` — minimal roster visibility; full user management (search/filter/pagination) belongs to the future Admin dashboard module |

## 5. Testing Requirement
Per `docs/10_Testing_Standards.md` §3, every role-gated route needs tests
asserting: unauthenticated → 401, authenticated-but-wrong-role → 403,
authenticated-with-allowed-role → 200/201. `requireRole` itself is unit
tested in isolation (`backend/src/middleware/require-role.test.ts`); each
route additionally documents its own role boundary per §4 above.
