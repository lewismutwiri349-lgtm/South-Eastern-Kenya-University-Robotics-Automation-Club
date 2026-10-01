import { Hono } from "hono";
import { getApplicationById } from "../../services/admin/applicant-management-service";
import { requireAuth } from "../../middleware/require-auth";
import { requireRole } from "../../middleware/require-role";
import { ADMIN_STAFF_ROLES } from "./roles";
import type { Env, AuthVariables } from "../../types/env";

export const getAdminApplicationRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

/** Admin view of any single application, regardless of who owns it. */
getAdminApplicationRoute.get("/:id", requireAuth, requireRole(...ADMIN_STAFF_ROLES), async (c) => {
  const application = await getApplicationById(c.env, c.req.param("id"));
  if (!application) {
    return c.json({ error: { code: "NOT_FOUND", message: "Application not found" } }, 404);
  }
  return c.json({ data: application });
});
