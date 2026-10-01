import { Hono } from "hono";
import { users } from "../../../../database/schema";
import { createDb } from "../../db/client";
import { requireAuth } from "../../middleware/require-auth";
import { requireRole } from "../../middleware/require-role";
import type { Env, AuthVariables } from "../../types/env";

export const listUsersRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

/**
 * Minimal roster visibility for leadership — intentionally small (no
 * search/filter/pagination). Superseded for staff use by
 * `GET /api/admin/users` (`docs/modules/admin-dashboard.md`), which adds
 * pagination, filtering and search; this route is left in place rather
 * than removed since retiring it wasn't part of that module's scope, and
 * it still proves the auth + RBAC middleware chain end to end per
 * `docs/07_User_Roles.md` §4.
 */
listUsersRoute.get(
  "/",
  requireAuth,
  requireRole("super_admin", "chairperson", "vice_chairperson", "secretary"),
  async (c) => {
    const db = createDb(c.env);
    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        emailVerified: users.emailVerifiedAt,
      })
      .from(users);

    return c.json({ data: rows });
  }
);
