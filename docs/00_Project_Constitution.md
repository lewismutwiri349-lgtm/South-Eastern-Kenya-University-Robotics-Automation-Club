# 00 — Project Constitution

## Purpose
This document is the single source of truth for how the Robotics & Autonomous
Systems Club Management Platform is built, governed, and extended. Every
future module must remain consistent with what's defined here. If a later
decision conflicts with this document, this document wins unless explicitly
amended (with a dated changelog entry at the bottom).

---

## 1. Engineering Philosophy

- **Correctness over speed.** A slower, correct implementation beats a fast,
  fragile one. We do not ship code we haven't reasoned through.
- **Maintainability over cleverness.** If a simpler, more boring solution
  exists, we use it. Clever code is a liability five years from now when
  nobody — including the original author — remembers why it's clever.
- **Optimize for five-year understandability.** Every module should be
  readable and modifiable by an engineer who has never seen the codebase,
  without needing to ask the original author.
- **Every architectural decision must reduce, not defer, long-term technical
  debt.** Shortcuts are allowed only when explicitly labeled as such, with a
  tracked follow-up.
- **Trade-offs are explained before implementation, not discovered after.**
  If a decision has a downside, it gets said out loud before code is written.

## 2. AI Operating Rules
These rules govern how I (Claude, acting as engineering partner) operate on
this project. They are not suggestions.

- **Never guess.** If I'm not certain about an API, a library behavior, a
  Cloudflare platform limit, or a requirement, I say so and verify rather
  than presenting a guess as fact.
- **Never fabricate APIs, packages, or capabilities.** If something doesn't
  exist or I'm unsure it exists, I flag it instead of inventing it.
- **Never create placeholder or mock logic unless explicitly requested.**
  No fake data, stub functions pretending to be real, or "TODO: implement
  later" logic presented as working code.
- **Challenge poor architectural decisions.** If a request conflicts with
  this constitution or introduces long-term risk, I say so before
  implementing it — including when the request comes from the project owner.
- **Recommend improvements when appropriate**, even if unasked, but briefly
  and without derailing the current scope.
- **Explain trade-offs before implementation**, not as a postscript.
- **Stop immediately after completing the agreed scope.** No unrequested
  extra features, no "while I was in there I also..." additions.
- **Never silently modify unrelated files.** Every file touched is called
  out explicitly.
- **Never skip milestones. Never generate multiple modules in one pass.**
- **Never redesign the architecture without approval**, even if I believe a
  redesign would be better — I propose it and wait.
- **Never remove existing functionality unless instructed.**
- **Never rename files unless justified**, and the justification is stated
  before doing it.
- **Never change established project conventions** without approval.
- **Before implementing any requested work, I determine whether it belongs
  to the current milestone.** If it doesn't, I say so and decline to
  implement it until scope is explicitly confirmed — rather than quietly
  absorbing it into the current module.

## 3. Definition of "Module Complete"
A module is complete only when all of the following are true:
- [ ] Code follows `docs/12_Coding_Standards.md`
- [ ] Input validation and error handling are in place per `docs/08_Security_Standards.md`
- [ ] Manual test steps are documented and verified; automated tests exist per `docs/10_Testing_Standards.md`
- [ ] No TODOs left unresolved without an explicit tracked follow-up
- [ ] Relevant `docs/` files are updated in the same change set
- [ ] Documentation package per `docs/13_Documentation_Standards.md` exists for the feature
- [ ] You (project owner) have explicitly approved moving on

## 4. User Roles (authoritative list)
`Super Admin`, `Chairperson`, `Vice Chairperson`, `Secretary`, `Treasurer`,
`Division Head`, `Project Leader`, `Moderator`, `Member`, `Applicant`, `Visitor`

Full permission mapping lives in `docs/07_User_Roles.md` (written with the Auth module).

## 5. Documentation Index
The full engineering handbook. Status reflects what currently exists.

| # | Document | Status |
|---|---|---|
| 00 | Project Constitution | ✅ this document |
| 01 | Product Vision | ✅ done |
| 02 | Engineering Principles | ✅ done |
| 03 | Technical Architecture | ✅ done |
| 04 | Database Design | ✅ done |
| 05 | API Standards | ✅ done |
| 06 | UI Design System | ✅ done |
| 07 | User Roles & RBAC | ✅ done |
| 08 | Security Standards | ✅ done |
| 09 | Development Workflow | ✅ done |
| 10 | Testing Standards | ✅ done |
| 11 | Git Workflow | ✅ done |
| 12 | Coding Standards | ✅ done |
| 13 | Documentation Standards | ✅ done |
| 14 | Performance Standards | ✅ done |
| 15 | Deployment Guide | ⏳ pending (with deployment module) |
| 16 | Monitoring & Logging | ✅ done |
| 17 | Feature Roadmap | ✅ done |
| 18 | AI Operating Manual | ✅ done |
| 19 | Change Management | ✅ done |

## Changelog
- **2026-08-04** — Initial constitution drafted; Next.js + Hono on Workers stack confirmed.
- **2026-08-04** — Added Engineering Philosophy, AI Operating Rules, and Documentation Index; restructured toward full 20-document handbook per project owner feedback.
- **2026-08-04** — Batch 2 complete: Security Standards (08), Testing Standards (10), Git Workflow (11), Coding Standards (12) written.
- **2026-08-04** — Batch 3 complete: UI Design System (06), Development Workflow (09), Documentation Standards (13), Performance Standards (14) written.
- **2026-08-04** — Batch 4 complete: Monitoring & Logging (16), Feature Roadmap (17), AI Operating Manual (18), Change Management (19) written. Handbook complete except 04, 05, 07, 15 — each intentionally deferred to its owning implementation module.
- **2026-08-04** — Module 1 (Project Scaffolding) complete; discovered and corrected a deprecated dependency (`@cloudflare/next-on-pages` → OpenNext), documented in `03_Technical_Architecture.md`. Database Design (04) and API Standards (05) written against the real scaffold. Handbook now at 18/20 — only `07_User_Roles` (Auth module) and `15_Deployment_Guide` (deployment module) remain, both intentionally deferred.
- **2026-08-08** — Module 2 (Identity domain) complete: registration, email verification, login/session, password reset, and RBAC middleware, all verified against a running Worker. `07_User_Roles.md` written — handbook now at 19/20, only `15_Deployment_Guide` remains, deferred to the deployment module.
- **2026-09-16** — Phase 2 (Public Website) closed out. Pending Projects (3d) and Awards (3e) packages applied (hand-merged, not overwritten, to preserve the existing CORS fix). Gallery, Resources and Contact domains built. Identity frontend added (login, register, forgot/reset password, verify email) — `/login` had been a dead link in the header. Header given a mobile nav. Per-IP rate limiting extracted from `middleware/identity-rate-limit.ts` into a shared `middleware/rate-limit.ts` factory for Contact's public write endpoint; behaviour unchanged, verified by the pre-existing Identity suite. ESLint introduced for the first time (flat config, all three packages). Repo cleaned of ~40 stale root-level duplicates and empty stub files. Test suite grown 72 → 158. Handbook still at 19/20 — only `15_Deployment_Guide` remains, deferred to the deployment module.
