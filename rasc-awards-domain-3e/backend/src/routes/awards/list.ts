import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { listAwardsQuerySchema } from "../../schemas/awards";
import { listPublishedAwards } from "../../services/awards/awards-service";
import type { Env } from "../../types/env";

export const listAwardsRoute = new Hono<{ Bindings: Env }>();

listAwardsRoute.get("/", zValidator("query", listAwardsQuerySchema), async (c) => {
  const { limit, cursor } = c.req.valid("query");
  const { awards: results, nextCursor } = await listPublishedAwards(c.env, { limit, cursor });

  return c.json({
    data: results.map((a) => ({
      id: a.id,
      title: a.title,
      slug: a.slug,
      recipientName: a.recipientName,
      category: a.category,
      awardedAt: a.awardedAt,
      coverImageUrl: a.coverImageUrl,
    })),
    meta: { nextCursor },
  });
});
