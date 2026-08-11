import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { resetPasswordSchema } from "../../schemas/identity";
import {
  resetPassword,
  InvalidResetTokenError,
  ResetTokenExpiredError,
} from "../../services/identity/password-reset-service";
import type { Env } from "../../types/env";

export const resetPasswordRoute = new Hono<{ Bindings: Env }>();

resetPasswordRoute.post("/", zValidator("json", resetPasswordSchema), async (c) => {
  const { token, newPassword } = c.req.valid("json");

  try {
    await resetPassword(c.env, token, newPassword);
    return c.json({ data: { reset: true } }, 200);
  } catch (err) {
    if (err instanceof InvalidResetTokenError) {
      return c.json({ error: { code: "INVALID_TOKEN", message: err.message } }, 400);
    }
    if (err instanceof ResetTokenExpiredError) {
      return c.json({ error: { code: "TOKEN_EXPIRED", message: err.message } }, 400);
    }
    throw err;
  }
});
