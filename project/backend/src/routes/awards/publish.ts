import { Hono } from "hono";
import { publishAward, AwardNotFoundError } from "../../services/awards/awards-service";
import { requireAuth } from "../../middleware/require-auth";
import { requireRole } from "../../middleware/require-role";
import type { Env, AuthVariables } from "../../types/env";

export const publishAwardRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

const AUTHOR_ROLES = ["super_admin", "chairperson", "vice_chairperson", "secretary", "moderator"] as const;

publishAwardRoute.post("/:id/publish", requireAuth, requireRole(...AUTHOR_ROLES), async (c) => {
  const id = c.req.param("id");

  try {
    await publishAward(c.env, id);
    return c.json({ data: { published: true } });
  } catch (err) {
    if (err instanceof AwardNotFoundError) {
      return c.json({ error: { code: "NOT_FOUND", message: err.message } }, 404);
    }
    throw err;
  }
});
