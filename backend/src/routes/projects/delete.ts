import { Hono } from "hono";
import { deleteProject, ProjectNotFoundError } from "../../services/projects/projects-service";
import { requireAuth } from "../../middleware/require-auth";
import { requireRole } from "../../middleware/require-role";
import type { Env, AuthVariables } from "../../types/env";

export const deleteProjectRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

const OWNER_ROLES = ["super_admin", "chairperson", "vice_chairperson", "secretary", "moderator"] as const;

deleteProjectRoute.delete("/:id", requireAuth, requireRole(...OWNER_ROLES), async (c) => {
  const id = c.req.param("id");

  try {
    await deleteProject(c.env, id);
    return c.body(null, 204);
  } catch (err) {
    if (err instanceof ProjectNotFoundError) {
      return c.json({ error: { code: "NOT_FOUND", message: err.message } }, 404);
    }
    throw err;
  }
});
