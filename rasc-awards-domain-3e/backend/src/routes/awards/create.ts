import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createAwardSchema } from "../../schemas/awards";
import { createAward } from "../../services/awards/awards-service";
import { requireAuth } from "../../middleware/require-auth";
import { requireRole } from "../../middleware/require-role";
import type { Env, AuthVariables } from "../../types/env";

export const createAwardRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// Same content-management role set as News/Events/Projects.
const AUTHOR_ROLES = ["super_admin", "chairperson", "vice_chairperson", "secretary", "moderator"] as const;

createAwardRoute.post(
  "/",
  requireAuth,
  requireRole(...AUTHOR_ROLES),
  zValidator("json", createAwardSchema),
  async (c) => {
    const input = c.req.valid("json");
    const authorId = c.get("userId");
    const result = await createAward(c.env, authorId, input);
    return c.json({ data: result }, 201);
  }
);
