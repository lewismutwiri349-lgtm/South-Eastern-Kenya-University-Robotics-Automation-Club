
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  resendVerificationEmail,
} from "../../services/identity/email-verification-service";
import type { Env } from "../../types/env";
import { identityRateLimit } from "../../middleware/identity-rate-limit";

const resendVerificationSchema = z.object({
  email: z.string().email(),
});

export const resendVerificationRoute = new Hono<{ Bindings: Env }>();

resendVerificationRoute.post(
  "/",
  identityRateLimit,
  zValidator("json", resendVerificationSchema),
  async (c) => {
    const { email } = c.req.valid("json");

    await resendVerificationEmail(c.env, email);

    // Deliberately use the same response whether or not
    // the account exists, to avoid exposing registered emails.
    return c.json(
      {
        data: {
          message:
            "If an account exists with this email, a verification email has been sent.",
        },
      },
      200
    );
  }
);
