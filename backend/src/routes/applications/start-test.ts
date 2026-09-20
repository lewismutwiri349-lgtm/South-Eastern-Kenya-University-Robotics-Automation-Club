import { Hono } from "hono";
import { startTest } from "../../services/applications/aptitude-test-service";
import { requireAuth } from "../../middleware/require-auth";
import { requireRole } from "../../middleware/require-role";
import type { Env, AuthVariables } from "../../types/env";

export const startTestRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

/**
 * POST /api/applications/:id/start-test
 * Start a new aptitude test for the applicant.
 * Returns test instance and randomized questions.
 */
startTestRoute.post(
  "/:id/start-test",
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
      const result = await startTest(c.env.DB, appId);
      return c.json(
        {
          data: {
            test: result.test,
            questions: result.questions,
          },
        },
        200
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to start test";
      if (message.includes("already passed")) {
        return c.json({ error: { code: "CONFLICT", message } }, 409);
      }
      if (message.includes("Maximum")) {
        return c.json({ error: { code: "CONFLICT", message } }, 409);
      }
      return c.json({ error: { code: "INTERNAL_ERROR", message } }, 500);
    }
  }
);
