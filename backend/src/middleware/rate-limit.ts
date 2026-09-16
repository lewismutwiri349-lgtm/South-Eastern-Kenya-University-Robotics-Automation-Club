import { and, eq } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import { identityRateLimits } from "../../../database/schema";
import { createDb } from "../db/client";
import { evaluateRateLimit } from "../services/identity/rate-limit-policy";
import { hashToken } from "../services/identity/tokens";
import type { Env } from "../types/env";

/**
 * Per-IP fixed-window rate limiting, backed by D1 and keyed on
 * (route, hashed identifier). Extracted from
 * `middleware/identity-rate-limit.ts` when the Contact domain (2026-09-16)
 * needed the same protection on its public submission endpoint with a
 * different threshold — rather than copy-pasting a second near-identical
 * implementation. `identityRateLimit` is now built from this factory and is
 * behaviourally unchanged (same limit, same window, same headers, same 429
 * body); the existing Identity API tests are what prove that.
 *
 * KNOWN NAMING DEBT, tracked not hidden: the backing table is still called
 * `identity_rate_limits` even though it is now a shared concern. It is
 * keyed by route path, so there is no correctness problem — only a
 * misleading name. Renaming it needs a migration and SQLite/D1 table
 * renames are worth doing deliberately rather than as a side effect of this
 * change; see docs/modules/contact.md §9.
 */
export function createRateLimit({
  maxRequests,
  windowMs,
}: {
  maxRequests: number;
  windowMs: number;
}) {
  return createMiddleware<{ Bindings: Env }>(async (c, next) => {
    const db = createDb(c.env);
    const identifierHash = await hashToken(c.req.header("CF-Connecting-IP") ?? "local-development");
    const route = c.req.path;

    const [entry] = await db
      .select()
      .from(identityRateLimits)
      .where(
        and(
          eq(identityRateLimits.route, route),
          eq(identityRateLimits.identifierHash, identifierHash)
        )
      );

    const result = evaluateRateLimit(
      entry?.requestCount ?? 0,
      entry?.windowStartedAt ?? null,
      maxRequests,
      windowMs
    );

    await persistRateLimit(db, entry?.id, route, identifierHash, result, windowMs);

    c.header("X-RateLimit-Limit", String(maxRequests));
    c.header("X-RateLimit-Remaining", String(Math.max(0, maxRequests - result.requestCount)));
    c.header("X-RateLimit-Reset", String(Math.ceil(result.resetAt.getTime() / 1000)));

    if (!result.allowed) {
      return c.json(
        { error: { code: "RATE_LIMITED", message: "Too many requests. Try again later." } },
        429
      );
    }

    await next();
  });
}

async function persistRateLimit(
  db: ReturnType<typeof createDb>,
  entryId: string | undefined,
  route: string,
  identifierHash: string,
  result: ReturnType<typeof evaluateRateLimit>,
  windowMs: number
): Promise<void> {
  const windowStartedAt = new Date(result.resetAt.getTime() - windowMs);

  if (entryId) {
    await db
      .update(identityRateLimits)
      .set({ requestCount: result.requestCount, windowStartedAt })
      .where(eq(identityRateLimits.id, entryId));
    return;
  }

  await db.insert(identityRateLimits).values({
    id: crypto.randomUUID(),
    route,
    identifierHash,
    requestCount: result.requestCount,
    windowStartedAt,
  });
}
