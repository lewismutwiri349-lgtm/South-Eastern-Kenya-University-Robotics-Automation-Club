import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { testSubmissionSchema } from "../../schemas/applications";
import { submitTest } from "../../services/applications/aptitude-test-service";
import { requireAuth } from "../../middleware/require-auth";
import { requireRole } from "../../middleware/require-role";
import type { Env, AuthVariables } from "../../types/env";

export const submitTestRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

/**
 * POST /api/applications/:id/submit-test
 * Submit test answers and receive score.
 */
submitTestRoute.post(
  "/:id/submit-test",
  requireAuth,
  requireRole("applicant"),
  zValidator("json", testSubmissionSchema),
  async (c) => {
    const input = c.req.valid("json");
    const appId = c.req.param("id");
    const userId = c.get("userId");

    // Verify the application belongs to the current user and get the test ID
    const app = await c.env.DB.prepare(
      `SELECT id FROM applications WHERE id = ? AND user_id = ? AND deleted_at IS NULL`
    )
      .bind(appId, userId)
      .first<{ id: string }>();

    if (!app) {
      return c.json({ error: { code: "NOT_FOUND", message: "Application not found" } }, 404);
    }

    // Get the most recent test for this application
    const test = await c.env.DB.prepare(
      `SELECT id FROM aptitude_tests WHERE application_id = ? ORDER BY created_at DESC LIMIT 1`
    )
      .bind(appId)
      .first<{ id: string }>();

    if (!test) {
      return c.json({ error: { code: "NOT_FOUND", message: "Test not found" } }, 404);
    }

    try {
      const result = await submitTest(c.env.DB, test.id, appId, input.answers);
      return c.json({ data: result }, 200);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to submit test";
      if (message.includes("time limit")) {
        return c.json({ error: { code: "INVALID_REQUEST", message } }, 400);
      }
      if (message.includes("already submitted")) {
        return c.json({ error: { code: "CONFLICT", message } }, 409);
      }
      return c.json({ error: { code: "INTERNAL_ERROR", message } }, 500);
    }
  }
);
