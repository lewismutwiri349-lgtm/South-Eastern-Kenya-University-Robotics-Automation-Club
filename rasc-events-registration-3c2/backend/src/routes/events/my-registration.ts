import { Hono } from "hono";
import { getMyRegistration } from "../../services/events/registration-service";
import { requireAuth } from "../../middleware/require-auth";
import type { Env, AuthVariables } from "../../types/env";

export const myRegistrationRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

myRegistrationRoute.get("/:id/registrations/me", requireAuth, async (c) => {
  const eventId = c.req.param("id");
  const userId = c.get("userId");

  const registration = await getMyRegistration(c.env, eventId, userId);
  return c.json({ data: registration ?? { status: null } });
});
