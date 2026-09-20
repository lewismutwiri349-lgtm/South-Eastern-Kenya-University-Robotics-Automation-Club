import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { listGalleryItemsQuerySchema } from "../../schemas/gallery";
import { listPublishedGalleryItems } from "../../services/gallery/gallery-service";
import type { Env } from "../../types/env";

export const listGalleryItemsRoute = new Hono<{ Bindings: Env }>();

listGalleryItemsRoute.get("/", zValidator("query", listGalleryItemsQuerySchema), async (c) => {
  const { limit, cursor, category } = c.req.valid("query");
  const { items, nextCursor } = await listPublishedGalleryItems(c.env, { limit, cursor, category });

  return c.json({
    data: items.map((item) => ({
      id: item.id,
      title: item.title,
      slug: item.slug,
      caption: item.caption,
      imageUrl: item.imageUrl,
      category: item.category,
      capturedAt: item.capturedAt,
    })),
    meta: { nextCursor },
  });
});
