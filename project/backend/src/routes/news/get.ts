import { Hono } from "hono";
import { getPublishedArticleBySlug } from "../../services/news/news-service";
import type { Env } from "../../types/env";

export const getArticleRoute = new Hono<{ Bindings: Env }>();

getArticleRoute.get("/:slug", async (c) => {
  const slug = c.req.param("slug");
  const article = await getPublishedArticleBySlug(c.env, slug);

  if (!article) {
    return c.json({ error: { code: "NOT_FOUND", message: "Article not found" } }, 404);
  }

  return c.json({
    data: {
      id: article.id,
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt,
      body: article.body,
      publishedAt: article.publishedAt,
    },
  });
});
