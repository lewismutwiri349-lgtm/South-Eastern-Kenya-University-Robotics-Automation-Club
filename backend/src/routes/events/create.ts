import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createEventSchema } from "../../schemas/events";
import { createEvent } from "../../services/events/events-service";
import { requireAuth } from "../../middleware/require-auth";
import { requireRole } from "../../middleware/require-role";
import type { Env, AuthVariables } from "../../types/env";

export const createEventRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// Mirrors News's AUTHOR_ROLES (docs/07_User_Roles.md §4) — same
// content-management trust boundary, no Events-specific role decided yet.
const ORGANIZER_ROLES = ["super_admin", "chairperson", "vice_chairperson", "secretary", "moderator"] as const;

createEventRoute.post(
  "/",
  requireAuth,
  requireRole(...ORGANIZER_ROLES),
  zValidator("json", createEventSchema),
  async (c) => {
    const input = c.req.valid("json");
    const organizerId = c.get("userId");
    const result = await createEvent(c.env, organizerId, input);
    return c.json({ data: result }, 201);
  }
);
