import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { applicationSubmissionSchema } from "../../schemas/applications";
import { submitApplication } from "../../services/applications/applications-service";
import { requireAuth } from "../../middleware/require-auth";
import { requireRole } from "../../middleware/require-role";
import type { Env, AuthVariables } from "../../types/env";

export const submitApplicationRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

/**
 * POST /api/applications/submit
 * Submit or update an application for the current applicant.
 * Idempotent — resubmitting updates the draft and advances status.
 */
submitApplicationRoute.post(
  "/",
  requireAuth,
  requireRole("applicant"),
  zValidator("json", applicationSubmissionSchema),
  async (c) => {
    const input = c.req.valid("json");
    const userId = c.get("userId");

    // Fetch user email from database
    const user = await c.env.DB.prepare("SELECT email FROM users WHERE id = ?").bind(userId).first<{
      email: string;
    }>();

    if (!user) {
      return c.json({ error: { code: "NOT_FOUND", message: "User not found" } }, 404);
    }

    const application = await submitApplication(c.env.DB, userId, user.email, input);

    return c.json({ data: application }, 201);
  }
);
