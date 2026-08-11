import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { listArticlesQuerySchema } from "../../schemas/news";
import { listPublishedArticles } from "../../services/news/news-service";
import type { Env } from "../../types/env";

export const listArticlesRoute = new Hono<{ Bindings: Env }>();

listArticlesRoute.get("/", zValidator("query", listArticlesQuerySchema), async (c) => {
  const { limit, cursor } = c.req.valid("query");
  const { articles, nextCursor } = await listPublishedArticles(c.env, { limit, cursor });

  return c.json({
    data: articles.map((a) => ({
      id: a.id,
      title: a.title,
      slug: a.slug,
      excerpt: a.excerpt,
      publishedAt: a.publishedAt,
    })),
    meta: { nextCursor },
  });
});
