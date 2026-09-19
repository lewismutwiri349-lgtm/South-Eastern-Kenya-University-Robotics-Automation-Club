# 17 — Feature Roadmap

High-level sequencing of modules. This is a planning reference, not a
commitment to build in this exact order — priorities can shift, but any
reordering is an explicit decision, not silent drift (per
`19_Change_Management.md`).

## Phase 0 — Foundation (in progress)
- [x] Handbook documentation (this set)
- [ ] Module 1: Project Scaffolding — repo skeleton, `04_Database_Design.md`, `05_API_Standards.md`

## Phase 1 — Identity & Access
- [ ] Auth: registration, login, email verification, password reset
- [ ] RBAC implementation + `07_User_Roles.md`
- [ ] Session management, account lockout, audit log foundation

## Phase 2 — Public Website
- [ ] Home, About, Divisions
- [ ] News (separate from Events)
- [ ] Events (registration, countdown, calendar, attendance)
- [ ] Projects (public-facing listing/detail views)
- [ ] Awards & Recognition (public view)
- [ ] Gallery, Resources, Contact

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
