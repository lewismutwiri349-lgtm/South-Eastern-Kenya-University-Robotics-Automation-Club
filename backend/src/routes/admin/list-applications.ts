import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { listApplicationsQuerySchema } from "../../schemas/admin";
import { listApplications } from "../../services/admin/applicant-management-service";
import { requireAuth } from "../../middleware/require-auth";
import { requireRole } from "../../middleware/require-role";
import { ADMIN_STAFF_ROLES } from "./roles";
import type { Env, AuthVariables } from "../../types/env";

export const listAdminApplicationsRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

/**
 * Admin-wide view across every applicant, unlike the applicant's own
 * `GET /api/applications/:id` (own record only). Secretary is included per
 * docs/07_User_Roles.md's role description ("membership administration").
 */
listAdminApplicationsRoute.get(
  "/",
  requireAuth,
  requireRole(...ADMIN_STAFF_ROLES),
  zValidator("query", listApplicationsQuerySchema),
  async (c) => {
    const { limit, cursor, status } = c.req.valid("query");
    const { applications, nextCursor } = await listApplications(c.env, { limit, cursor, status });

    return c.json({ data: applications, meta: { nextCursor } });
  }
);
