# 01 — Product Vision

## Vision Statement
The Robotics Club Management Platform shall become a reusable engineering
collaboration platform capable of serving universities, engineering
societies, research teams, and innovation hubs beyond the founding
institution — not by accident, but because it was built on generic business
domains rather than institution-specific pages from day one.

## What Success Looks Like in Five Years
- The founding club runs its full lifecycle on the platform: recruiting,
  onboarding, project execution, competitions, awards, and alumni tracking.
- The codebase can be white-labeled or forked for a second organization
  without rewriting core logic — only branding, content, and role naming
  change.
- New modules (e.g. a Research domain, a Sponsorship domain) can be added
  without touching unrelated domains, because domain boundaries were
  respected from the start.
- No single file or module has become unmaintainable "legacy code that
  nobody wants to touch."

## Why Domain-Driven Design, Not Page-Driven Design
Thinking in *pages* ("the Projects page", "the Admin dashboard") leads to
logic scattered across UI routes with no clear ownership boundary. Thinking
in *domains* means each domain owns its data, business rules, and
permissions — and pages become thin presentation layers over domains,
potentially reused across public site, portals, and dashboards.

## Business Domains (authoritative list)
Every current and future feature belongs to exactly one of these domains.
If a proposed feature doesn't fit cleanly, that's a signal to either refine
the domain boundaries (with explicit approval) or reconsider the feature.

| Domain | Owns |
|---|---|
| **Identity** | Auth, sessions, roles, permissions, email verification, password reset |
| **Membership** | Member profiles, skills, certifications, digital membership card, division assignment, applicant lifecycle |
| **Projects** | Project records, file uploads (CAD/images/video/PDF/ZIP), versioning, GitHub links, tags/categories |
| **Research** | (future) research initiatives, publications — reserved domain, not built yet |
| **Competitions** | (future) competition entries, results — reserved domain, not built yet |
| **Events** | Event listings, registration, countdown, calendar, attendance |
| **News** | News articles — explicitly separate from Events |
| **Awards** | Badges, certificates, Hall of Fame, Engineer/Project of the Month |
| **Learning** | (future) resources, training material, onboarding curricula |
| **Administration** | User management, moderation, division/news/event management, system settings, audit logs |
| **Notifications** | Email/in-app notifications, reminders, digests |
| **Storage** | File upload handling, R2 object lifecycle, access control on files |
| **Analytics** | Reporting, dashboards, usage metrics |

Domains marked "future/reserved" are named now so folder and permission
structures don't need to be reworked later, but **no code is written for
them until their module is explicitly reached.**

## Non-Goals (explicit scope boundaries)
Stating these prevents scope creep disguised as "future-proofing":
- We are not building a general-purpose CMS or website builder.
- We are not building multi-tenant SaaS infrastructure (billing, tenant
  isolation at the infra level) *now* — the domain boundaries make it
  possible later, but multi-tenancy is not in scope for the founding
  deployment.
- We are not building a mobile app in this phase — the API-first backend
  makes it possible later without rework.

## How This Constrains Today's Decisions
- Folder structure inside `backend/src/routes` and `services` will align to
  domains, not to pages (see `docs/03_Technical_Architecture.md` for current
  structure; a domain-aligned reorganization note is added there).
- Permissions (`docs/07_User_Roles.md`) will be defined per-domain, not
  per-page.
- Database schema (`docs/04_Database_Design.md`) will group tables by domain
  ownership.
