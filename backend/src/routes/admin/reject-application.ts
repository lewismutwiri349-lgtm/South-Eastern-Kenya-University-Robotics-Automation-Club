import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { applicationDecisionSchema } from "../../schemas/admin";
import {
  rejectApplication,
  ApplicationNotFoundError,
  InvalidApplicationStatusError,
} from "../../services/admin/applicant-management-service";
import { requireAuth } from "../../middleware/require-auth";
import { requireRole } from "../../middleware/require-role";
import { ADMIN_STAFF_ROLES } from "./roles";
import type { Env, AuthVariables } from "../../types/env";

export const rejectApplicationRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

rejectApplicationRoute.post(
  "/:id/reject",
  requireAuth,
  requireRole(...ADMIN_STAFF_ROLES),
  zValidator("json", applicationDecisionSchema),
  async (c) => {
    const actorUserId = c.get("userId");
    const applicationId = c.req.param("id");
    const { reason } = c.req.valid("json");

    try {
      const application = await rejectApplication(c.env, { actorUserId, applicationId, reason });
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
