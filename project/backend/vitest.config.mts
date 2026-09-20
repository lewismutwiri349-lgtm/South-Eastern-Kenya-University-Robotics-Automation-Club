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
 */
async function readJournalTrackedMigrations() {
  const { unstable_splitSqlQuery } = await import("wrangler");
  const migrationsDir = path.join(import.meta.dirname, "../database/migrations");
  const journal = JSON.parse(
    readFileSync(path.join(migrationsDir, "meta/_journal.json"), "utf8")
  ) as { entries: { tag: string }[] };

  return journal.entries.map(({ tag }) => ({
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
