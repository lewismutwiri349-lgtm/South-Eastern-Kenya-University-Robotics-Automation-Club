# 02 — Engineering Principles

This document elaborates the philosophy from `00_Project_Constitution.md`
into working principles. Concrete, enforceable rules (line limits, function
size, file structure) live in `docs/12_Coding_Standards.md`, written when we
reach the scaffolding module. This document explains the *reasoning*;
`12_Coding_Standards.md` will give the *rules*.

## 1. Correctness Discipline
- Every function has a single, well-defined responsibility (SRP).
- Business logic never lives in route handlers or UI components — it lives
  in `services/`, independently testable.
- Validation happens at the boundary (API layer) even if the frontend also
  validates. The frontend's validation is a UX convenience, never a security
  control.
- Errors are handled explicitly, not swallowed. Every catch block either
  recovers meaningfully or re-throws/logs with context.

## 2. Maintainability Discipline
- Prefer explicit code over clever abstractions. A junior engineer should be
  able to read a function top to bottom and understand it without needing to
  jump through five layers of indirection.
- No duplicated logic — if validation, formatting, or a business rule
  appears twice, it gets extracted.
- No dead code left "just in case." Delete it; version control remembers it.
- Naming is descriptive over terse. `getActiveApplicantsByDivision` over
  `getData`.

## 3. Domain Boundaries (see `01_Product_Vision.md`)
- Code for one domain (e.g. Projects) does not directly reach into another
  domain's internals (e.g. Membership's database tables). Cross-domain
  interaction happens through service-layer function calls, not shared
  mutable state or direct cross-table queries scattered across domains.
- This is enforced at the folder level: `backend/src/services/<domain>/`.

## 4. Change Discipline
- Every module's change set is scoped to that module. Unrelated
  refactors, even beneficial ones, are proposed separately and require
  their own approval.
- No breaking changes to existing functionality without an explicit
  callout and the project owner's sign-off.

## 5. Trade-off Transparency
Before implementing anything with more than one reasonable approach, the
options and their trade-offs are stated — performance vs. simplicity,
flexibility vs. YAGNI, etc. — so the project owner is choosing, not
discovering the choice after the fact.

## 6. Quality Bar Applied at Every Layer
| Layer | Standard applied |
|---|---|
| API routes | Thin — validation + delegation only |
| Services | Where business logic and domain rules live |
| Database | Schema reflects domain ownership; no orphaned/ambiguous tables |
| Frontend components | Reusable, no business logic, receive data via props/hooks |
| Tests | Cover the "why" (business rule) not just the "what" (line coverage) |

## 7. What This Means Practically
When a new module starts, before any code is written we will:
1. Identify which domain(s) it touches.
2. Identify what's genuinely new vs. what should reuse an existing service.
3. Flag any tension with these principles before writing code, not after.
