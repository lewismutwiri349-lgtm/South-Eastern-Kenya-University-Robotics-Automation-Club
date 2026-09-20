import { Hono } from "hono";
import {
  markContactMessageHandled,
  ContactMessageNotFoundError,
} from "../../services/contact/contact-service";
import { requireAuth } from "../../middleware/require-auth";
import { requireRole } from "../../middleware/require-role";
import type { Env, AuthVariables } from "../../types/env";

export const handleContactMessageRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

const HANDLER_ROLES = ["super_admin", "chairperson", "vice_chairperson", "secretary", "moderator"] as const;

handleContactMessageRoute.post("/:id/handle", requireAuth, requireRole(...HANDLER_ROLES), async (c) => {
  const id = c.req.param("id");

  try {
    await markContactMessageHandled(c.env, id);
    return c.json({ data: { handled: true } });
  } catch (err) {
    if (err instanceof ContactMessageNotFoundError) {
      return c.json({ error: { code: "NOT_FOUND", message: err.message } }, 404);
    }
    throw err;
  }
});
