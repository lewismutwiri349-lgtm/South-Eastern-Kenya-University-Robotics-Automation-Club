import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { interviewSchedulingSchema } from "../../schemas/applications";
import { scheduleInterview } from "../../services/applications/interview-service";
import { requireAuth } from "../../middleware/require-auth";
import { requireRole } from "../../middleware/require-role";
import type { Env, AuthVariables } from "../../types/env";

export const scheduleInterviewRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

/**
 * POST /api/applications/:id/schedule-interview
 * Book an interview slot for the applicant.
 */
scheduleInterviewRoute.post(
  "/:id/schedule-interview",
  requireAuth,
  requireRole("applicant"),
  zValidator("json", interviewSchedulingSchema),
  async (c) => {
    const input = c.req.valid("json");
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
      const scheduled = await scheduleInterview(c.env.DB, appId, input.slotId);
      return c.json({ data: scheduled }, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to schedule interview";
      if (message.includes("pass the aptitude test")) {
        return c.json({ error: { code: "INVALID_REQUEST", message } }, 400);
      }
      if (message.includes("already has")) {
        return c.json({ error: { code: "CONFLICT", message } }, 409);
      }
      if (message.includes("slot is full")) {
        return c.json({ error: { code: "CONFLICT", message } }, 409);
      }
      if (message.includes("not found")) {
        return c.json({ error: { code: "NOT_FOUND", message } }, 404);
      }
      return c.json({ error: { code: "INTERNAL_ERROR", message } }, 500);
    }
  }
);
