import { Hono } from "hono";
import { getPublishedResourceBySlug } from "../../services/resources/resources-service";
import type { Env } from "../../types/env";

export const getResourceRoute = new Hono<{ Bindings: Env }>();

getResourceRoute.get("/:slug", async (c) => {
  const slug = c.req.param("slug");
  const resource = await getPublishedResourceBySlug(c.env, slug);

  if (!resource) {
    return c.json({ error: { code: "NOT_FOUND", message: "Resource not found" } }, 404);
  }

  return c.json({
    data: {
      id: resource.id,
      title: resource.title,
      slug: resource.slug,
      description: resource.description,
      url: resource.url,
      category: resource.category,
      publishedAt: resource.publishedAt,
    },
  });
});
