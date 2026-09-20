export type RateLimitResult = {
  allowed: boolean;
  requestCount: number;
  resetAt: Date;
};

/** Evaluates a fixed-window rate limit without retaining an IP address. */
export function evaluateRateLimit(
  currentCount: number,
  windowStartedAt: Date | null,
  limit: number,
  windowMs: number,
  now = new Date()
): RateLimitResult {
  const windowExpired = !windowStartedAt || now.getTime() >= windowStartedAt.getTime() + windowMs;
  const count = windowExpired ? 1 : currentCount + 1;
  const start = windowExpired ? now : windowStartedAt;
  return {
    allowed: count <= limit,
    requestCount: count,
    resetAt: new Date(start.getTime() + windowMs),
  };
}
