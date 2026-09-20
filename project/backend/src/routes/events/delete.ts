import { Hono } from "hono";
import { deleteEvent, EventNotFoundError } from "../../services/events/events-service";
import { requireAuth } from "../../middleware/require-auth";
import { requireRole } from "../../middleware/require-role";
import type { Env, AuthVariables } from "../../types/env";

export const deleteEventRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

const ORGANIZER_ROLES = ["super_admin", "chairperson", "vice_chairperson", "secretary", "moderator"] as const;

deleteEventRoute.delete("/:id", requireAuth, requireRole(...ORGANIZER_ROLES), async (c) => {
  const id = c.req.param("id");

  try {
    await deleteEvent(c.env, id);
    return c.body(null, 204);
  } catch (err) {
    if (err instanceof EventNotFoundError) {
      return c.json({ error: { code: "NOT_FOUND", message: err.message } }, 404);
    }
    throw err;
  }
});
