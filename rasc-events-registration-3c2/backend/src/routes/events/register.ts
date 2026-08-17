import { Hono } from "hono";
import {
  registerForEvent,
  AlreadyRegisteredError,
} from "../../services/events/registration-service";
import { EventNotFoundError } from "../../services/events/events-service";
import { requireAuth } from "../../middleware/require-auth";
import type { Env, AuthVariables } from "../../types/env";

export const registerForEventRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// Any authenticated user may register — confirmed with Lewis 2026-08-14.
// No requireRole here, deliberately (unlike the content-management routes).
registerForEventRoute.post("/:id/register", requireAuth, async (c) => {
  const eventId = c.req.param("id");
  const userId = c.get("userId");

  try {
    const result = await registerForEvent(c.env, eventId, userId);
    return c.json({ data: result }, 201);
  } catch (err) {
    if (err instanceof EventNotFoundError) {
      return c.json({ error: { code: "NOT_FOUND", message: err.message } }, 404);
    }
    if (err instanceof AlreadyRegisteredError) {
      return c.json({ error: { code: "ALREADY_REGISTERED", message: err.message } }, 409);
    }
    throw err;
  }
});
