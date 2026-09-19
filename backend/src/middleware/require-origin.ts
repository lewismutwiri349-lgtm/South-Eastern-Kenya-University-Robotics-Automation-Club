import { createMiddleware } from "hono/factory";
import type { Env } from "../types/env";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * CSRF guard for a cookie-authenticated API whose session cookie is
 * `SameSite=None` in deployed environments (see `cookie-config.ts`).
 *
 * Browsers always attach an `Origin` header to cross-origin state-changing
 * requests, so a request that carries one must come from the configured
 * frontend. Requests with no `Origin` (curl, server-to-server, the test
 * harness) are not browser-driven cross-site requests and pass through —
 * they cannot ride on a victim's cookies.
 */
export const requireAllowedOrigin = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const origin = c.req.header("Origin");
  if (!origin || SAFE_METHODS.has(c.req.method)) {
    return next();
  }

  const allowed = c.env.FRONTEND_URL?.trim().replace(/\/+$/, "");
  if (!allowed || origin !== allowed) {
    return c.json({ error: { code: "FORBIDDEN_ORIGIN", message: "Origin not allowed" } }, 403);
  }

  return next();
});
