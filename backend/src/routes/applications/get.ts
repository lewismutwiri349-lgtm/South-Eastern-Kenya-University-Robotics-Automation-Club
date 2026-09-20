import { Hono } from "hono";
import { requireAuth } from "../../middleware/require-auth";
import { requireRole } from "../../middleware/require-role";
import type { Env, AuthVariables } from "../../types/env";

export const getApplicationRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

/**
 * GET /api/applications/:id
 * Fetch application details (applicants can only fetch their own).
 */
getApplicationRoute.get(
  "/:id",
  requireAuth,
  requireRole("applicant"),
  async (c) => {
    const appId = c.req.param("id");
    const userId = c.get("userId");

    // Fetch application
    const app = await c.env.DB.prepare(
      `SELECT * FROM applications WHERE id = ? AND user_id = ? AND deleted_at IS NULL`
    )
      .bind(appId, userId)
      .first<any>();

    if (!app) {
      return c.json({ error: { code: "NOT_FOUND", message: "Application not found" } }, 404);
    }

    return c.json({ data: app }, 200);
  }
);
