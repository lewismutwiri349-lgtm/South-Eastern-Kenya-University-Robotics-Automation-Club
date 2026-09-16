import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { listContactMessagesQuerySchema } from "../../schemas/contact";
import { listContactMessages } from "../../services/contact/contact-service";
import { requireAuth } from "../../middleware/require-auth";
import { requireRole } from "../../middleware/require-role";
import type { Env, AuthVariables } from "../../types/env";

export const listContactMessagesRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

/**
 * Same role set as the content domains. Inbound enquiries are club
 * correspondence, and the Secretary/Chairperson line is who answers them;
 * `docs/07_User_Roles.md` records this explicitly rather than leaving it
 * implied by the code.
 *
 * `submitterIpHash` is never returned — it exists for abuse correlation
 * inside the system, not for staff to read.
 */
const HANDLER_ROLES = ["super_admin", "chairperson", "vice_chairperson", "secretary", "moderator"] as const;

listContactMessagesRoute.get(
  "/",
  requireAuth,
  requireRole(...HANDLER_ROLES),
  zValidator("query", listContactMessagesQuerySchema),
  async (c) => {
    const { limit, cursor, handled } = c.req.valid("query");
    const { messages, nextCursor } = await listContactMessages(c.env, { limit, cursor, handled });

    return c.json({
      data: messages.map((m) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        subject: m.subject,
        message: m.message,
        handledAt: m.handledAt,
        createdAt: m.createdAt,
      })),
      meta: { nextCursor },
    });
  }
);
