import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createProjectSchema } from "../../schemas/projects";
import { createProject } from "../../services/projects/projects-service";
import { requireAuth } from "../../middleware/require-auth";
import { requireRole } from "../../middleware/require-role";
import type { Env, AuthVariables } from "../../types/env";

export const createProjectRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// Same content-management role set as News/Events — see docs/07_User_Roles.md.
const OWNER_ROLES = ["super_admin", "chairperson", "vice_chairperson", "secretary", "moderator"] as const;

createProjectRoute.post(
  "/",
  requireAuth,
  requireRole(...OWNER_ROLES),
  zValidator("json", createProjectSchema),
  async (c) => {
    const input = c.req.valid("json");
    const ownerId = c.get("userId");
    const result = await createProject(c.env, ownerId, input);
    return c.json({ data: result }, 201);
  }
);
