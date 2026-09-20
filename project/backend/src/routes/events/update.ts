import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { updateEventSchema } from "../../schemas/events";
import { updateEvent, EventNotFoundError } from "../../services/events/events-service";
import { requireAuth } from "../../middleware/require-auth";
import { requireRole } from "../../middleware/require-role";
import type { Env, AuthVariables } from "../../types/env";

export const updateEventRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

const ORGANIZER_ROLES = ["super_admin", "chairperson", "vice_chairperson", "secretary", "moderator"] as const;

updateEventRoute.patch(
  "/:id",
  requireAuth,
  requireRole(...ORGANIZER_ROLES),
  zValidator("json", updateEventSchema),
  async (c) => {
    const id = c.req.param("id");
    const input = c.req.valid("json");

    try {
      await updateEvent(c.env, id, input);
      return c.json({ data: { updated: true } });
    } catch (err) {
      if (err instanceof EventNotFoundError) {
        return c.json({ error: { code: "NOT_FOUND", message: err.message } }, 404);
      }
      throw err;
    }
  }
);
