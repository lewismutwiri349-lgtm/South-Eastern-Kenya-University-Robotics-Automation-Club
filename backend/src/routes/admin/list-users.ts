import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { listUsersQuerySchema } from "../../schemas/admin";
import { listUsers } from "../../services/admin/user-management-service";
import { requireAuth } from "../../middleware/require-auth";
import { requireRole } from "../../middleware/require-role";
import { ADMIN_STAFF_ROLES } from "./roles";
import type { Env, AuthVariables } from "../../types/env";

export const listAdminUsersRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

/**
 * Same role set as the existing minimal roster route
 * (`GET /api/identity/users`), which this supersedes for staff use — see
 * docs/07_User_Roles.md's Administration Domain section. That older route
 * is left in place rather than removed, since removing it isn't part of
 * this module's scope.
 */
listAdminUsersRoute.get(
  "/",
  requireAuth,
  requireRole(...ADMIN_STAFF_ROLES),
  zValidator("query", listUsersQuerySchema),
  async (c) => {
    const { limit, cursor, role, q } = c.req.valid("query");
    const { users, nextCursor } = await listUsers(c.env, { limit, cursor, role, q });

    return c.json({
      data: users.map((u) => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        emailVerified: u.emailVerifiedAt !== null,
        createdAt: u.createdAt,
      })),
      meta: { nextCursor },
    });
  }
);
