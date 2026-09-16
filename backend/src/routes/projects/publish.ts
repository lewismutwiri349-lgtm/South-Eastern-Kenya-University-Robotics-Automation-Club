import { Hono } from "hono";
import { publishProject, ProjectNotFoundError } from "../../services/projects/projects-service";
import { requireAuth } from "../../middleware/require-auth";
import { requireRole } from "../../middleware/require-role";
import type { Env, AuthVariables } from "../../types/env";

export const publishProjectRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

const OWNER_ROLES = ["super_admin", "chairperson", "vice_chairperson", "secretary", "moderator"] as const;

publishProjectRoute.post("/:id/publish", requireAuth, requireRole(...OWNER_ROLES), async (c) => {
  const id = c.req.param("id");

  try {
    await publishProject(c.env, id);
    return c.json({ data: { published: true } });
  } catch (err) {
    if (err instanceof ProjectNotFoundError) {
      return c.json({ error: { code: "NOT_FOUND", message: err.message } }, 404);
    }
    throw err;
  }
});
