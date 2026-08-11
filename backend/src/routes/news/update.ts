import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { updateArticleSchema } from "../../schemas/news";
import { updateArticle, ArticleNotFoundError } from "../../services/news/news-service";
import { requireAuth } from "../../middleware/require-auth";
import { requireRole } from "../../middleware/require-role";
import type { Env, AuthVariables } from "../../types/env";

export const updateArticleRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

const AUTHOR_ROLES = ["super_admin", "chairperson", "vice_chairperson", "secretary", "moderator"] as const;

updateArticleRoute.patch(
  "/:id",
  requireAuth,
  requireRole(...AUTHOR_ROLES),
  zValidator("json", updateArticleSchema),
  async (c) => {
    const id = c.req.param("id");
    const input = c.req.valid("json");

    try {
      await updateArticle(c.env, id, input);
      return c.json({ data: { updated: true } });
    } catch (err) {
      if (err instanceof ArticleNotFoundError) {
        return c.json({ error: { code: "NOT_FOUND", message: err.message } }, 404);
      }
      throw err;
    }
  }
);
