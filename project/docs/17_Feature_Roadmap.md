# 17 — Feature Roadmap

High-level sequencing of modules. This is a planning reference, not a
commitment to build in this exact order — priorities can shift, but any
reordering is an explicit decision, not silent drift (per
`19_Change_Management.md`).

## Phase 0 — Foundation ✅
- [x] Handbook documentation (this set)
- [x] Module 1: Project Scaffolding — repo skeleton, `04_Database_Design.md`, `05_API_Standards.md`

## Phase 1 — Identity & Access ✅
- [x] Auth: registration, login, email verification, password reset
- [x] RBAC implementation + `07_User_Roles.md`
- [x] Session management, account lockout, audit log foundation

## Phase 2 — Public Website ✅
- [x] Frontend app shell — layout, header (with mobile nav), footer, theme system
- [x] Home, About, Divisions
- [x] News (separate from Events)
- [x] Events — content management + registration/waitlisting
  - [ ] Countdown, calendar view — deferred, presentation-layer only (`docs/modules/events.md` §11)
  - [ ] Per-event attendance/check-in — deferred; see the scope note below
- [x] Projects (public-facing listing/detail views)
- [x] Awards & Recognition (public view)
- [x] Gallery (public listing/detail, category filter)
- [x] Resources (curated external links, category filter)
- [x] Contact (public submission + staff triage API)
- [x] Identity frontend — login, register, forgot/reset password, verify email

**Scope note — "attendance tracking".** It appears under both Phase 2
(Events) and Phase 7 (Leadership Dashboard). These are most likely two
different things — per-event check-in versus ongoing meeting/division
attendance — and were not assumed to be the same feature. Both remain
open; flagged in `docs/modules/events.md` §11.

## Phase 3 — Applicant Portal
- [ ] Application submission
- [ ] Timed aptitude test engine
- [ ] Engineering scenario questions
- [ ] Status tracking
- [ ] Interview scheduling

## Phase 4 — Member Portal
- [ ] Personal profile, skills, certifications
- [ ] Digital membership card
- [ ] Member-facing project view, achievements, division assignment

## Phase 5 — Project Management (full)
- [ ] Drag-and-drop uploads (images, video, CAD, PDF, ZIP)
- [ ] Version history
- [ ] Search, filters, categories, tags
- [ ] GitHub link integration

## Phase 6 — Admin Dashboard
- [ ] User management, applicant management
- [ ] Project moderation (flag/hide/request changes/approve)
- [ ] Division, News, Event, Awards, Certificate management
- [ ] Reports, analytics, audit log viewer, system settings

## Phase 7 — Leadership Dashboard
- [ ] Division Head / Project Leader views
- [ ] Attendance tracking
- [ ] Meeting scheduling
- [ ] Progress tracking

## Phase 8 — Awards System (full)
- [ ] Badges, certificates
- [ ] Hall of Fame
- [ ] Engineer of the Month / Project of the Month workflows

## Phase 9 — Deployment & Operations
- [ ] `15_Deployment_Guide.md` written against the real staging/prod setup
- [ ] Production monitoring dashboards live (per `16_Monitoring_Logging.md`)
- [ ] First public launch

## Beyond Founding Scope (reserved domains, not scheduled)
- Research domain
- Competitions domain
- Multi-institution/white-label support (per `01_Product_Vision.md` non-goals)

## How This Roadmap Is Used
At the start of each module, we confirm it against this roadmap. If we
deviate from this order, the reason is stated explicitly (per
`09_Development_Workflow.md` §1) rather than just quietly building whatever
seems interesting next.
