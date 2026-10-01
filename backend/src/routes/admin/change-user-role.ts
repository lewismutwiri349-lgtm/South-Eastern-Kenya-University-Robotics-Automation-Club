import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { changeUserRoleSchema } from "../../schemas/admin";
import {
  changeUserRole,
  SelfRoleChangeError,
  UserNotFoundError,
} from "../../services/admin/user-management-service";
import { requireAuth } from "../../middleware/require-auth";
import { requireRole } from "../../middleware/require-role";
import { ROLE_GRANT_ROLES } from "./roles";
import type { Env, AuthVariables } from "../../types/env";

export const changeUserRoleRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

/**
 * Deliberately narrower than the list route's role set: granting a role
 * (treasurer, division_head, moderator, etc.) is a governance decision, not
 * routine roster administration, so Vice Chairperson and Secretary can see
 * the roster but not change roles on it. See
 * docs/07_User_Roles.md's Administration Domain section for the rationale.
 */
changeUserRoleRoute.patch(
  "/:id/role",
  requireAuth,
  requireRole(...ROLE_GRANT_ROLES),
  zValidator("json", changeUserRoleSchema),
  async (c) => {
    const targetUserId = c.req.param("id");
    const actorUserId = c.get("userId");
    const { role } = c.req.valid("json");

    try {
      const updated = await changeUserRole(c.env, { actorUserId, targetUserId, newRole: role });
      return c.json({ data: updated });
    } catch (err) {
      if (err instanceof SelfRoleChangeError) {
        return c.json({ error: { code: "FORBIDDEN", message: err.message } }, 403);
      }
      if (err instanceof UserNotFoundError) {
        return c.json({ error: { code: "NOT_FOUND", message: err.message } }, 404);
      }
      throw err;
    }
  }
);
