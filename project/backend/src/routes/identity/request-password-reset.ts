import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { requestPasswordResetSchema } from "../../schemas/identity";
import { requestPasswordReset } from "../../services/identity/password-reset-service";
import type { Env } from "../../types/env";
import { identityRateLimit } from "../../middleware/identity-rate-limit";

export const requestPasswordResetRoute = new Hono<{ Bindings: Env }>();

requestPasswordResetRoute.post(
  "/",
  identityRateLimit,
  zValidator("json", requestPasswordResetSchema),
  async (c) => {
    const { email } = c.req.valid("json");
    await requestPasswordReset(c.env, email);

    // Same response whether or not the email exists — matches
    // requestPasswordReset's enumeration-prevention design.
    return c.json({
      data: { message: "If that email is registered, a reset link has been sent." },
    });
  }
);
