import { Hono } from "hono";
import { getScheduledInterviews } from "../../services/applications/interview-service";
import { requireAuth } from "../../middleware/require-auth";
import { requireRole } from "../../middleware/require-role";
import type { Env, AuthVariables } from "../../types/env";

export const getInterviewsRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

/**
 * GET /api/applications/:id/interviews
 * Fetch scheduled interviews for an applicant.
 */
getInterviewsRoute.get(
  "/:id/interviews",
  requireAuth,
  requireRole("applicant"),
  async (c) => {
    const appId = c.req.param("id");
    const userId = c.get("userId");

    // Verify the application belongs to the current user
    const app = await c.env.DB.prepare(
      `SELECT id FROM applications WHERE id = ? AND user_id = ? AND deleted_at IS NULL`
    )
      .bind(appId, userId)
      .first<{ id: string }>();

    if (!app) {
      return c.json({ error: { code: "NOT_FOUND", message: "Application not found" } }, 404);
    }

    try {
      const interviews = await getScheduledInterviews(c.env.DB, appId);
      return c.json(
        {
          data: interviews,
          meta: {
            count: interviews.length,
          },
        },
        200
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch interviews";
      return c.json({ error: { code: "INTERNAL_ERROR", message } }, 500);
    }
  }
);
