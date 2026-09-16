import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { listProjectsQuerySchema } from "../../schemas/projects";
import { listPublishedProjects } from "../../services/projects/projects-service";
import type { Env } from "../../types/env";

export const listProjectsRoute = new Hono<{ Bindings: Env }>();

listProjectsRoute.get("/", zValidator("query", listProjectsQuerySchema), async (c) => {
  const { limit, cursor } = c.req.valid("query");
  const { projects: results, nextCursor } = await listPublishedProjects(c.env, { limit, cursor });

  return c.json({
    data: results.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      summary: p.summary,
      coverImageUrl: p.coverImageUrl,
      publishedAt: p.publishedAt,
    })),
    meta: { nextCursor },
  });
});
