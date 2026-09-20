import { createMiddleware } from "hono/factory";
import type { Env, AuthVariables } from "../types/env";
import type { UserRole } from "../../../database/schema";

/**
 * Must run after requireAuth in a route's middleware chain — relies on
 * `role` already being set in context by session lookup. Every protected
 * route declares its allowed roles explicitly here, rather than an
 * implicit "if logged in" check — matches docs/08_Security_Standards.md §2.
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return createMiddleware<{ Bindings: Env; Variables: AuthVariables }>(async (c, next) => {
    const role = c.get("role");
    if (!allowedRoles.includes(role)) {
      return c.json(
        { error: { code: "FORBIDDEN", message: "You do not have permission to perform this action" } },
        403
      );
    }
    await next();
  });
}
