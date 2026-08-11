import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { registerSchema } from "../../schemas/identity";
import { registerUser, EmailAlreadyRegisteredError } from "../../services/identity/registration-service";
import type { Env } from "../../types/env";

export const registerRoute = new Hono<{ Bindings: Env }>();

registerRoute.post("/", zValidator("json", registerSchema), async (c) => {
  const input = c.req.valid("json");

  try {
    const result = await registerUser(c.env, input);
    return c.json({ data: { userId: result.userId } }, 201);
  } catch (err) {
    if (err instanceof EmailAlreadyRegisteredError) {
      return c.json({ error: { code: "EMAIL_TAKEN", message: err.message } }, 409);
    }
    throw err;
  }
});
