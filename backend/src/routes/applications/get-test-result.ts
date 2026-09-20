import { Hono } from "hono";
import { getTestResult } from "../../services/applications/aptitude-test-service";
import { requireAuth } from "../../middleware/require-auth";
import { requireRole } from "../../middleware/require-role";
import type { Env, AuthVariables } from "../../types/env";

export const getTestResultRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

/**
 * GET /api/applications/:id/test-result
 * Fetch the most recent test result for an applicant.
 */
getTestResultRoute.get(
  "/:id/test-result",
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

    const result = await getTestResult(c.env.DB, appId);

    if (!result) {
      return c.json({ error: { code: "NOT_FOUND", message: "Test result not found" } }, 404);
    }

    return c.json({ data: result }, 200);
  }
);
