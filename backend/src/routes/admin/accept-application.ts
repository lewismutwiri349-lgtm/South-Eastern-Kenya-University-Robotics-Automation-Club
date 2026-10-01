import { Hono } from "hono";
import {
  acceptApplication,
  ApplicationNotFoundError,
  InvalidApplicationStatusError,
} from "../../services/admin/applicant-management-service";
import { requireAuth } from "../../middleware/require-auth";
import { requireRole } from "../../middleware/require-role";
import { ADMIN_STAFF_ROLES } from "./roles";
import type { Env, AuthVariables } from "../../types/env";

export const acceptApplicationRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

acceptApplicationRoute.post(
  "/:id/accept",
  requireAuth,
  requireRole(...ADMIN_STAFF_ROLES),
  async (c) => {
    const actorUserId = c.get("userId");
    const applicationId = c.req.param("id");

    try {
      const application = await acceptApplication(c.env, { actorUserId, applicationId });
      return c.json({ data: application });
    } catch (err) {
      if (err instanceof ApplicationNotFoundError) {
        return c.json({ error: { code: "NOT_FOUND", message: err.message } }, 404);
      }
      if (err instanceof InvalidApplicationStatusError) {
        return c.json({ error: { code: "CONFLICT", message: err.message } }, 409);
      }
      throw err;
    }
  }
);
