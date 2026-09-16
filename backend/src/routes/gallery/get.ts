import { Hono } from "hono";
import { getPublishedGalleryItemBySlug } from "../../services/gallery/gallery-service";
import type { Env } from "../../types/env";

export const getGalleryItemRoute = new Hono<{ Bindings: Env }>();

getGalleryItemRoute.get("/:slug", async (c) => {
  const slug = c.req.param("slug");
  const item = await getPublishedGalleryItemBySlug(c.env, slug);

  if (!item) {
    return c.json({ error: { code: "NOT_FOUND", message: "Gallery item not found" } }, 404);
  }

  return c.json({
    data: {
      id: item.id,
      title: item.title,
      slug: item.slug,
      caption: item.caption,
      imageUrl: item.imageUrl,
      category: item.category,
      capturedAt: item.capturedAt,
      publishedAt: item.publishedAt,
    },
  });
});
