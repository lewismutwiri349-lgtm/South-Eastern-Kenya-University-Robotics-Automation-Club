import { createMiddleware } from "hono/factory";
import { getCookie } from "hono/cookie";
import { getValidSession } from "../services/identity/session-service";
import { SESSION_COOKIE_NAME } from "../services/identity/cookie-config";
import type { Env, AuthVariables } from "../types/env";

/**
 * Like requireAuth, but a missing/invalid session is not an error — it
 * just leaves `userId`/`role` unset. For routes that serve both signed-in
 * members and anonymous public visitors (e.g. a published project's public
 * files), where "not logged in" degrades to public-level access rather
 * than a 401.
 */
export const optionalAuth = createMiddleware<{ Bindings: Env; Variables: Partial<AuthVariables> }>(
  async (c, next) => {
    const token = getCookie(c, SESSION_COOKIE_NAME);
    if (token) {
      const session = await getValidSession(c.env, token);
      if (session) {
        c.set("userId", session.userId);
        c.set("role", session.role);
      }
    }
    await next();
  }
);
