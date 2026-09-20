import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { updateProjectSchema } from "../../schemas/projects";
import { updateProject, ProjectNotFoundError } from "../../services/projects/projects-service";
import { requireAuth } from "../../middleware/require-auth";
import { requireRole } from "../../middleware/require-role";
import type { Env, AuthVariables } from "../../types/env";

export const updateProjectRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

const OWNER_ROLES = ["super_admin", "chairperson", "vice_chairperson", "secretary", "moderator"] as const;

updateProjectRoute.patch(
  "/:id",
  requireAuth,
  requireRole(...OWNER_ROLES),
  zValidator("json", updateProjectSchema),
  async (c) => {
    const id = c.req.param("id");
    const input = c.req.valid("json");

    try {
      await updateProject(c.env, id, input);
      return c.json({ data: { updated: true } });
    } catch (err) {
      if (err instanceof ProjectNotFoundError) {
        return c.json({ error: { code: "NOT_FOUND", message: err.message } }, 404);
      }
      throw err;
    }
  }
);
