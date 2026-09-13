import { Hono } from "hono";
import {
  cancelRegistration,
  RegistrationNotFoundError,
} from "../../services/events/registration-service";
import { requireAuth } from "../../middleware/require-auth";
import type { Env, AuthVariables } from "../../types/env";

export const cancelRegistrationRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// Self-service only — cancels the caller's own registration. There's no
// organizer-removes-someone-else endpoint in this slice; confirmed with
// Lewis 2026-08-14 that self-service cancel was the requirement. An
// organizer-initiated removal is a reasonable future addition, not built
// here to avoid guessing at whether it should notify the registrant, free
// their seat differently, etc.
cancelRegistrationRoute.post("/:id/cancel-registration", requireAuth, async (c) => {
  const eventId = c.req.param("id");
  const userId = c.get("userId");

  try {
    await cancelRegistration(c.env, eventId, userId);
    return c.json({ data: { cancelled: true } });
  } catch (err) {
    if (err instanceof RegistrationNotFoundError) {
      return c.json({ error: { code: "NOT_FOUND", message: err.message } }, 404);
    }
    throw err;
  }
});
