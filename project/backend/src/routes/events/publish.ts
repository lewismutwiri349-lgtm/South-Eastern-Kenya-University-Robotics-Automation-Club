import { Hono } from "hono";
import { publishEvent, EventNotFoundError } from "../../services/events/events-service";
import { requireAuth } from "../../middleware/require-auth";
import { requireRole } from "../../middleware/require-role";
import type { Env, AuthVariables } from "../../types/env";

export const publishEventRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

const ORGANIZER_ROLES = ["super_admin", "chairperson", "vice_chairperson", "secretary", "moderator"] as const;

publishEventRoute.post("/:id/publish", requireAuth, requireRole(...ORGANIZER_ROLES), async (c) => {
  const id = c.req.param("id");

  try {
    await publishEvent(c.env, id);
    return c.json({ data: { published: true } });
  } catch (err) {
    if (err instanceof EventNotFoundError) {
      return c.json({ error: { code: "NOT_FOUND", message: err.message } }, 404);
    }
    throw err;
  }
});
