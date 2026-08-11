import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { setCookie } from "hono/cookie";
import { loginSchema } from "../../schemas/identity";
import {
  loginUser,
  AccountLockedError,
  InvalidCredentialsError,
  EmailNotVerifiedError,
} from "../../services/identity/login-service";
import { SESSION_COOKIE_NAME } from "../../services/identity/cookie-config";
import type { Env } from "../../types/env";
import { identityRateLimit } from "../../middleware/identity-rate-limit";

export const loginRoute = new Hono<{ Bindings: Env }>();

loginRoute.post("/", identityRateLimit, zValidator("json", loginSchema), async (c) => {
  const input = c.req.valid("json");

  try {
    const { rawToken, expiresAt, userId, role } = await loginUser(c.env, input);

    setCookie(c, SESSION_COOKIE_NAME, rawToken, {
      httpOnly: true,
      secure: c.env.ENVIRONMENT !== "development",
      sameSite: "Lax",
      path: "/",
      expires: expiresAt,
    });

    return c.json({ data: { userId, role } }, 200);
  } catch (err) {
    if (err instanceof InvalidCredentialsError) {
      return c.json({ error: { code: "INVALID_CREDENTIALS", message: err.message } }, 401);
    }
    if (err instanceof AccountLockedError) {
      return c.json({ error: { code: "ACCOUNT_LOCKED", message: err.message } }, 429);
    }
    if (err instanceof EmailNotVerifiedError) {
      return c.json({ error: { code: "EMAIL_NOT_VERIFIED", message: err.message } }, 403);
    }
    throw err;
  }
});
