import { createRateLimit } from "./rate-limit";

const MAX_REQUESTS = 5;
const WINDOW_MS = 1000 * 60 * 15;

/**
 * Applies a D1-backed per-IP limit to an unauthenticated Identity route.
 *
 * The implementation moved to `middleware/rate-limit.ts` on 2026-09-16 when
 * the Contact domain needed the same mechanism at a different threshold.
 * The thresholds here are unchanged (5 requests / 15 minutes) and this
 * export is kept so every Identity route that imports it stays untouched.
 */
export const identityRateLimit = createRateLimit({
  maxRequests: MAX_REQUESTS,
  windowMs: WINDOW_MS,
});
