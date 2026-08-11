import { Hono } from "hono";
import { getCookie, deleteCookie } from "hono/cookie";
import { requireAuth } from "../../middleware/require-auth";
import { revokeSession } from "../../services/identity/session-service";
import { SESSION_COOKIE_NAME } from "../../services/identity/cookie-config";
import { recordIdentityAuditEvent } from "../../services/identity/audit-service";
import type { Env, AuthVariables } from "../../types/env";

export const logoutRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

logoutRoute.post("/", requireAuth, async (c) => {
  const token = getCookie(c, SESSION_COOKIE_NAME);
  if (token) {
    await revokeSession(c.env, token);
  }
  await recordIdentityAuditEvent(c.env, { action: "logout", actorUserId: c.get("userId") });
  deleteCookie(c, SESSION_COOKIE_NAME, { path: "/" });
  return c.json({ data: { loggedOut: true } }, 200);
});
