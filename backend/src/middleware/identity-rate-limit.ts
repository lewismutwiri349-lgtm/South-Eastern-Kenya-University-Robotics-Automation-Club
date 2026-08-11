import { and, eq } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import { identityRateLimits } from "../../../database/schema";
import { createDb } from "../db/client";
import { evaluateRateLimit } from "../services/identity/rate-limit-policy";
import { hashToken } from "../services/identity/tokens";
import type { Env } from "../types/env";

const MAX_REQUESTS = 5;
const WINDOW_MS = 1000 * 60 * 15;

/** Applies a D1-backed per-IP limit to an unauthenticated Identity route. */
export const identityRateLimit = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const db = createDb(c.env);
  const identifierHash = await hashToken(c.req.header("CF-Connecting-IP") ?? "local-development");
  const route = c.req.path;
  const [entry] = await db
    .select()
    .from(identityRateLimits)
    .where(and(eq(identityRateLimits.route, route), eq(identityRateLimits.identifierHash, identifierHash)));
  const result = evaluateRateLimit(entry?.requestCount ?? 0, entry?.windowStartedAt ?? null, MAX_REQUESTS, WINDOW_MS);

  await persistRateLimit(db, entry?.id, route, identifierHash, result);
  c.header("X-RateLimit-Limit", String(MAX_REQUESTS));
  c.header("X-RateLimit-Remaining", String(Math.max(0, MAX_REQUESTS - result.requestCount)));
  c.header("X-RateLimit-Reset", String(Math.ceil(result.resetAt.getTime() / 1000)));
  if (!result.allowed) {
    return c.json({ error: { code: "RATE_LIMITED", message: "Too many requests. Try again later." } }, 429);
  }
  await next();
});

async function persistRateLimit(
  db: ReturnType<typeof createDb>,
  entryId: string | undefined,
  route: string,
  identifierHash: string,
  result: ReturnType<typeof evaluateRateLimit>
): Promise<void> {
  if (entryId) {
    await db.update(identityRateLimits).set({ requestCount: result.requestCount, windowStartedAt: new Date(result.resetAt.getTime() - WINDOW_MS) }).where(eq(identityRateLimits.id, entryId));
    return;
  }
  await db.insert(identityRateLimits).values({ id: crypto.randomUUID(), route, identifierHash, requestCount: result.requestCount, windowStartedAt: new Date(result.resetAt.getTime() - WINDOW_MS) });
}
