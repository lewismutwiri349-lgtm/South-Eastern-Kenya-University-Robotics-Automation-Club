import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { listResourcesQuerySchema } from "../../schemas/resources";
import { listPublishedResources } from "../../services/resources/resources-service";
import type { Env } from "../../types/env";

export const listResourcesRoute = new Hono<{ Bindings: Env }>();

listResourcesRoute.get("/", zValidator("query", listResourcesQuerySchema), async (c) => {
  const { limit, cursor, category } = c.req.valid("query");
  const { resources: results, nextCursor } = await listPublishedResources(c.env, {
    limit,
    cursor,
    category,
  });

  return c.json({
    data: results.map((r) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      description: r.description,
      url: r.url,
      category: r.category,
      publishedAt: r.publishedAt,
    })),
    meta: { nextCursor },
  });
});
