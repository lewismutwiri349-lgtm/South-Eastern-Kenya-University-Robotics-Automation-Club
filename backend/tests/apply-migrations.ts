import { applyD1Migrations, env as rawEnv } from "cloudflare:test";
import type { D1Migration } from "@cloudflare/vitest-pool-workers";
import type { Env } from "../src/types/env";

// `TEST_MIGRATIONS` is a test-only binding built in vitest.config.mts from
// the journal-tracked migration files (see that file for why it isn't
// `readD1Migrations()` against the raw directory) — real application code
// never reads it. `cloudflare:test`'s `env` is typed as the ambient,
// wrangler-generated `Cloudflare.Env`, which this project hasn't adopted
// (still on `@cloudflare/workers-types` + `src/types/env.ts`); cast rather
// than restructure that convention just for the test setup file.
const env = rawEnv as unknown as Env & { TEST_MIGRATIONS: D1Migration[] };

await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
