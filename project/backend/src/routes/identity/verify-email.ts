import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { verifyEmailSchema } from "../../schemas/identity";
import {
  verifyEmailToken,
  InvalidVerificationTokenError,
  VerificationTokenExpiredError,
} from "../../services/identity/email-verification-service";
import type { Env } from "../../types/env";

export const verifyEmailRoute = new Hono<{ Bindings: Env }>();

verifyEmailRoute.post("/", zValidator("json", verifyEmailSchema), async (c) => {
  const { token } = c.req.valid("json");

  try {
    await verifyEmailToken(c.env, token);
    return c.json({ data: { verified: true } }, 200);
  } catch (err) {
    if (err instanceof InvalidVerificationTokenError) {
      return c.json({ error: { code: "INVALID_TOKEN", message: err.message } }, 400);
    }
    if (err instanceof VerificationTokenExpiredError) {
      return c.json({ error: { code: "TOKEN_EXPIRED", message: err.message } }, 400);
    }
    throw err;
  }
});
