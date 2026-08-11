# 12 — Coding Standards

Concrete, enforceable rules. `docs/02_Engineering_Principles.md` explains
the *why*; this document is the *what*.

## 1. File & Function Size
- No file exceeds **300 lines**. If it does, it's a signal the file has more
  than one responsibility — split it.
- No function exceeds **40 lines**. Extract helper functions with
  descriptive names rather than adding inline complexity.
- No function takes more than 4 parameters — beyond that, pass an object.

## 2. Structure Per API Route (backend)
Every API route follows the same layered pattern, no exceptions:
1. **Validation** — Zod schema validates request input
2. **Service** — business logic, in `services/<domain>/`, framework-agnostic
3. **Repository** (via Drizzle) — data access, in `services/<domain>/repository.ts`
4. **Tests** — unit tests for the service, integration test for the route
5. **Documentation** — per `docs/13_Documentation_Standards.md`

Route handlers themselves contain no business logic — only: parse input →
call service → shape response.

## 3. Style Rules
- No nested ternary operators. Use `if/else` or extract a named function.
- No duplicated validation logic — shared validation rules live in
  `schemas/` and are imported, never copy-pasted.
- Prefer named exports over default exports (except Next.js pages, which
  require default exports by framework convention).
- Async/await over raw `.then()` chains.
- No `any` in TypeScript without an explicit comment justifying why
  (e.g. genuinely dynamic third-party payload).

## 4. Naming Conventions
- Files: `kebab-case.ts`
- Components: `PascalCase`
- Functions/variables: `camelCase`
- Database tables: `snake_case`, plural (`project_files`, not `ProjectFile`)
- API routes: `/api/<domain>/<resource>`, plural nouns (`/api/projects/`,
  `/api/events/:id/register`)

## 5. Comments
- Comments explain **why**, not **what** — the code should already say what
  it does. A comment justifying a non-obvious trade-off is welcome; a
  comment restating the line below it is not.
- Every exported function has a one-line doc comment describing its
  purpose, inputs, and outputs if not obvious from types.

## 6. Error Handling
- Every async operation that can fail is wrapped in explicit error handling.
- Errors are typed/classified (validation error, not-found, unauthorized,
  internal) so the API layer can map them to consistent HTTP status codes.
- No empty `catch` blocks. Ever.

## 7. Reusability
- If the same UI pattern appears twice, it becomes a shared component in
  `frontend/components/`.
- If the same business logic appears twice, it becomes a shared service
  function.
- Before writing new logic, check whether an equivalent already exists in
  the relevant domain's service folder.

## 8. What Gets Flagged in Review
Before any module is marked complete (per `docs/00_Project_Constitution.md`
§3), it's checked against this document. Violations are either fixed or
explicitly justified in the module's documentation as a deliberate,
approved exception.
