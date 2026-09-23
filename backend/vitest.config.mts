import { readFileSync } from "node:fs";
import path from "node:path";
import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

/**
 * Builds the migration list from `database/migrations/meta/_journal.json`
 * rather than `readD1Migrations()` against the raw directory, so
 * the test database's schema is exactly what the journal — and therefore
 * production — describes, even if a stray untracked .sql file ever
 * reappears in the directory (a legacy orphan, `0000_bitter_maximus.sql`,
 * was removed on 2026-09-19).
 *
 * Migrations 0007-0010 are hand-written raw SQL for tables Drizzle doesn't
 * manage (applications, member portal, project management — see each
 * file's header comment) and were never run through `drizzle-kit
 * generate`, so they're outside the journal. They're appended here, after
 * the journal-tracked ones, so `SELF.fetch`-based API tests can exercise
 * those tables too. Calling `applyD1Migrations` a second time from within
 * a test (rather than listing every migration in this one binding) hits an
 * RPC message-size crash in this pool-workers setup, so this is the only
 * place that list is assembled.
 */
const HAND_WRITTEN_MIGRATIONS = [
  "0007_polite_garia",
  "0008_seed_test_questions",
  "0009_member_portal",
  "0010_project_management",
];

async function readJournalTrackedMigrations() {
  const { unstable_splitSqlQuery } = await import("wrangler");
  const migrationsDir = path.join(import.meta.dirname, "../database/migrations");
  const journal = JSON.parse(
    readFileSync(path.join(migrationsDir, "meta/_journal.json"), "utf8")
  ) as { entries: { tag: string }[] };

  const tags = [...journal.entries.map((e) => e.tag), ...HAND_WRITTEN_MIGRATIONS];

  return tags.map((tag) => ({
    name: `${tag}.sql`,
    queries: unstable_splitSqlQuery(
      readFileSync(path.join(migrationsDir, `${tag}.sql`), "utf8")
    ),
  }));
}

export default defineConfig(async () => ({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.toml" },
      miniflare: {
        // Test-only binding — real code never reads this. Applied to the
        // isolated test D1 instance by tests/apply-migrations.ts before
        // any test runs.
        bindings: { TEST_MIGRATIONS: await readJournalTrackedMigrations() },
      },
    }),
  ],
  test: {
    setupFiles: ["./tests/apply-migrations.ts"],
  },
}));
