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

### News Domain
| Route | Allowed roles |
|---|---|
| `GET /api/news` | Anyone (unauthenticated) |
| `GET /api/news/:slug` | Anyone (unauthenticated) |
| `POST /api/news` | `super_admin`, `chairperson`, `vice_chairperson`, `secretary`, `moderator` |
| `PATCH /api/news/:id` | Same |
| `POST /api/news/:id/publish` | Same |
| `DELETE /api/news/:id` | Same |

No per-author ownership restriction — any author-role user can edit or
delete any article, not just their own. See `docs/modules/news.md` §5.
(This table was missing despite `docs/modules/news.md` §5 referencing it —
added 2026-08-14 while adding the Events table below.)

### Events Domain
| Route | Allowed roles |
|---|---|
| `GET /api/events` | Anyone (unauthenticated) |
| `GET /api/events/:slug` | Anyone (unauthenticated) |
| `POST /api/events` | `super_admin`, `chairperson`, `vice_chairperson`, `secretary`, `moderator` |
| `PATCH /api/events/:id` | Same |
| `POST /api/events/:id/publish` | Same |
| `DELETE /api/events/:id` | Same |
| `GET /api/events/:id/registrations` | Same |
| `POST /api/events/:id/register` | Any authenticated user |
| `POST /api/events/:id/cancel-registration` | Any authenticated user (self-service — own registration only) |
| `GET /api/events/:id/registrations/me` | Any authenticated user |

Content-management routes deliberately reuse News's role set rather than
inventing an Events-specific role — see `docs/modules/events.md` §5.
Registration routes are deliberately **not** gated to those roles —
registering is a member action, not a content-management action; see
`docs/modules/events.md` §5 and §10.1 (added 2026-08-15, confirmed with
Lewis).

### Projects Domain
| Route | Allowed roles |
|---|---|
| `GET /api/projects` | Anyone (unauthenticated) |
| `GET /api/projects/:slug` | Anyone (unauthenticated) |
| `POST /api/projects` | `super_admin`, `chairperson`, `vice_chairperson`, `secretary`, `moderator` |
| `PATCH /api/projects/:id` | Same |
| `POST /api/projects/:id/publish` | Same |
| `DELETE /api/projects/:id` | Same |

Same content-management role set as News and Events — see
`docs/modules/projects.md` §5.

### Awards Domain
| Route | Allowed roles |
|---|---|
| `GET /api/awards` | Anyone (unauthenticated) |
| `GET /api/awards/:slug` | Anyone (unauthenticated) |
| `POST /api/awards` | `super_admin`, `chairperson`, `vice_chairperson`, `secretary`, `moderator` |
| `PATCH /api/awards/:id` | Same |
| `POST /api/awards/:id/publish` | Same |
| `DELETE /api/awards/:id` | Same |

Same content-management role set as News, Events, and Projects — see
`docs/modules/awards.md` §5.

## 5. Testing Requirement
Per `docs/10_Testing_Standards.md` §3, every role-gated route needs tests
asserting: unauthenticated → 401, authenticated-but-wrong-role → 403,
authenticated-with-allowed-role → 200/201. `requireRole` itself is unit
tested in isolation (`backend/src/middleware/require-role.test.ts`); each
route additionally documents its own role boundary per §4 above.
