import { createMiddleware } from "hono/factory";
import { getCookie } from "hono/cookie";
import { getValidSession } from "../services/identity/session-service";
import { SESSION_COOKIE_NAME } from "../services/identity/cookie-config";
import type { Env, AuthVariables } from "../types/env";

/**
 * Every protected route across every domain uses this. Declares the
 * requirement explicitly in the route's middleware chain rather than
 * relying on implicit "if logged in" checks — matches
 * docs/08_Security_Standards.md §2.
 */
export const requireAuth = createMiddleware<{ Bindings: Env; Variables: AuthVariables }>(
  async (c, next) => {
    const token = getCookie(c, SESSION_COOKIE_NAME);
    if (!token) {
      return c.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, 401);
    }

    const session = await getValidSession(c.env, token);
    if (!session) {
      return c.json({ error: { code: "UNAUTHORIZED", message: "Session invalid or expired" } }, 401);
    }

    c.set("userId", session.userId);
    c.set("role", session.role);
    await next();
  }
);
