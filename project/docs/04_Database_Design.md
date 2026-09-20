# 04 — Database Design

No business tables exist yet — the first real schema lands with the Auth
module (Identity domain). This document defines the conventions every
future table must follow, written against the actual `database/` scaffold
from Module 1 (Drizzle ORM targeting Cloudflare D1/SQLite).

## 1. Schema Organization
- One file per domain: `database/schema/identity.ts`, `database/schema/membership.ts`,
  `database/schema/projects.ts`, etc. — matching the domain list in
  `docs/01_Product_Vision.md`.
- `database/schema/index.ts` re-exports every domain file as tables are
  added. It stays a barrel file, never contains table definitions itself.
- A table belongs to exactly one domain file, even if referenced by other
  domains via foreign key.

## 2. Table & Column Naming
(Restates `docs/12_Coding_Standards.md` §4 for completeness in this context)
- Table names: `snake_case`, plural — `applications`, `project_files`, `award_recipients`.
- Column names: `snake_case` — `created_at`, `division_id`.
- Foreign key columns: `<referenced_table_singular>_id` — `user_id`, `division_id`, `project_id`.

## 3. Primary Keys
- UUIDs (stored as `text`), generated application-side before insert, not
  auto-increment integers. Reasoning: avoids leaking record counts/creation
  order publicly (e.g. a project ID in a public URL), and avoids
  merge/import friction if data is ever migrated between environments.

## 4. Standard Columns
Every table includes, unless there's a specific documented reason not to:
- `id` — UUID primary key
- `created_at` — timestamp, set on insert
- `updated_at` — timestamp, updated on every write
- Domain-appropriate audit columns where relevant (e.g. `created_by_id`)
  for anything admin/moderation-related, per `docs/08_Security_Standards.md` §7

## 5. Soft Deletes vs Hard Deletes
- Content that has moderation/history value (projects, news, events,
  applications) uses a `deleted_at` nullable timestamp — soft delete.
  Queries filter `WHERE deleted_at IS NULL` by default via the repository
  layer, never left to each caller to remember.
- Purely transactional/ephemeral data (e.g. session tokens) uses hard
  deletes — no reason to retain them.
- Audit log entries are never deleted, soft or hard, by application code
  (per `docs/08_Security_Standards.md` §7).

## 6. Relationships & Foreign Keys
- Foreign keys are always declared explicitly in Drizzle's schema (not left
  implicit), so relationships are visible directly in the schema file.
- Cross-domain references (e.g. a `projects` table referencing a `users`
  table in Identity) are allowed at the schema/FK level — domain boundaries
  are enforced at the *service* layer (`docs/02_Engineering_Principles.md` §3),
  not by forbidding foreign keys across domain schema files.

## 7. Migrations
- Generated via `drizzle-kit generate` (already wired in `database/package.json`
  as `npm run db:generate` from the repo root) — migrations are never
  hand-written from scratch.
- Every migration is committed to `database/migrations/` and reviewed like
  any other code change — a migration is not exempt from PR review just
  because it's generated.
- No migration is edited after it has been applied to any shared
  environment (staging/production) — a mistake gets a new corrective
  migration, never a rewritten history.

## 8. Indexes
- Every foreign key column gets an index by default.
- Additional indexes are added deliberately, justified by an actual query
  pattern (e.g. filtering projects by division and status together) —
  not speculatively for every column.

## 9. Seed Data
- `database/seed/` (created when the first domain needs it) holds
  deterministic seed scripts for local development — enough data to
  exercise every role and a representative set of content, never
  production data.

## 10. What Gets Documented Per Table
When a module introduces new tables, its module documentation
(`docs/13_Documentation_Standards.md` §1, "Database" section) states: what
the table represents, its relationships, and why any column deviates from
these conventions.

## Changelog
- **2026-08-04** — Initial database design conventions drafted.
- **2026-08-08** — §8's "every foreign key gets an index" rule was caught
  being violated in the Identity domain's first real migration — `drizzle-kit
  generate` doesn't add FK indexes automatically, and `token_hash` columns
  (queried on every login/verification/reset) had no index at all. Fixed in
  `database/schema/identity.ts` before the migration was applied anywhere.
  Worth remembering for every future domain: explicit `index()`/`uniqueIndex()`
  calls are required in the schema, not assumed.
