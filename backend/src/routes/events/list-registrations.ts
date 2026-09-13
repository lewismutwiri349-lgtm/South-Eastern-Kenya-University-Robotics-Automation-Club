import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { listRegistrationsQuerySchema } from "../../schemas/events";
import { listRegistrations } from "../../services/events/registration-service";
import { EventNotFoundError } from "../../services/events/events-service";
import { requireAuth } from "../../middleware/require-auth";
import { requireRole } from "../../middleware/require-role";
import type { Env, AuthVariables } from "../../types/env";

export const listRegistrationsRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// Same content-management role set as create/update/publish/delete — an
// organizer viewing who's signed up is the same trust boundary as an
// organizer managing the event itself.
const ORGANIZER_ROLES = ["super_admin", "chairperson", "vice_chairperson", "secretary", "moderator"] as const;

listRegistrationsRoute.get(
  "/:id/registrations",
  requireAuth,
  requireRole(...ORGANIZER_ROLES),
  zValidator("query", listRegistrationsQuerySchema),
  async (c) => {
    const eventId = c.req.param("id");
    const { limit, cursor } = c.req.valid("query");

    try {
      const { registrations, nextCursor } = await listRegistrations(c.env, eventId, { limit, cursor });
      return c.json({
        data: registrations.map((r) => ({
          id: r.id,
          userId: r.userId,
          status: r.status,
          registeredAt: r.registeredAt,
          cancelledAt: r.cancelledAt,
        })),
        meta: { nextCursor },
      });
    } catch (err) {
      if (err instanceof EventNotFoundError) {
        return c.json({ error: { code: "NOT_FOUND", message: err.message } }, 404);
      }
      throw err;
    }
  }
);
