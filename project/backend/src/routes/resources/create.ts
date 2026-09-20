import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createResourceSchema } from "../../schemas/resources";
import { createResource } from "../../services/resources/resources-service";
import { requireAuth } from "../../middleware/require-auth";
import { requireRole } from "../../middleware/require-role";
import type { Env, AuthVariables } from "../../types/env";

export const createResourceRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

const AUTHOR_ROLES = ["super_admin", "chairperson", "vice_chairperson", "secretary", "moderator"] as const;

createResourceRoute.post(
  "/",
  requireAuth,
  requireRole(...AUTHOR_ROLES),
  zValidator("json", createResourceSchema),
  async (c) => {
    const input = c.req.valid("json");
    const authorId = c.get("userId");
    const result = await createResource(c.env, authorId, input);
    return c.json({ data: result }, 201);
  }
);
