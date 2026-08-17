import { Hono } from "hono";
import { getPublishedAwardBySlug } from "../../services/awards/awards-service";
import type { Env } from "../../types/env";

export const getAwardRoute = new Hono<{ Bindings: Env }>();

getAwardRoute.get("/:slug", async (c) => {
  const slug = c.req.param("slug");
  const award = await getPublishedAwardBySlug(c.env, slug);

  if (!award) {
    return c.json({ error: { code: "NOT_FOUND", message: "Award not found" } }, 404);
  }

  return c.json({
    data: {
      id: award.id,
      title: award.title,
      slug: award.slug,
      description: award.description,
      recipientName: award.recipientName,
      category: award.category,
      awardedAt: award.awardedAt,
      coverImageUrl: award.coverImageUrl,
      publishedAt: award.publishedAt,
    },
  });
});
