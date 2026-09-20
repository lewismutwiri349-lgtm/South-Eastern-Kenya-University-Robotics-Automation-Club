import { Hono } from "hono";
import { listAvailableSlots } from "../../services/applications/interview-service";
import { requireAuth } from "../../middleware/require-auth";
import { requireRole } from "../../middleware/require-role";
import type { Env, AuthVariables } from "../../types/env";

export const listInterviewSlotsRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

/**
 * GET /api/applications/interview-slots
 * List available interview slots for the next 14 days.
 * Returns only slots with available capacity.
 */
listInterviewSlotsRoute.get(
  "/interview-slots",
  requireAuth,
  requireRole("applicant"),
  async (c) => {
    try {
      const slots = await listAvailableSlots(c.env.DB);
      return c.json({ data: slots }, 200);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch interview slots";
      return c.json({ error: { code: "INTERNAL_ERROR", message } }, 500);
    }
  }
);
