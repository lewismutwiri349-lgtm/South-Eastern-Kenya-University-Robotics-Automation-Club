import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createArticleSchema } from "../../schemas/news";
import { createArticle } from "../../services/news/news-service";
import { requireAuth } from "../../middleware/require-auth";
import { requireRole } from "../../middleware/require-role";
import type { Env, AuthVariables } from "../../types/env";

export const createArticleRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

const AUTHOR_ROLES = ["super_admin", "chairperson", "vice_chairperson", "secretary", "moderator"] as const;

createArticleRoute.post(
  "/",
  requireAuth,
  requireRole(...AUTHOR_ROLES),
  zValidator("json", createArticleSchema),
  async (c) => {
    const input = c.req.valid("json");
    const authorId = c.get("userId");
    const result = await createArticle(c.env, authorId, input);
    return c.json({ data: result }, 201);
  }
);
