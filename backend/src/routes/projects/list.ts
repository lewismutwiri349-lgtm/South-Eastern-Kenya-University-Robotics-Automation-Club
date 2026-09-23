import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { searchProjectsQuerySchema } from "../../schemas/project-management";
import { searchProjects, InvalidCursorError } from "../../services/projects/project-search-service";
import type { Env } from "../../types/env";

export const listProjectsRoute = new Hono<{ Bindings: Env }>();

/**
 * Public project listing/search. Superset of the old cursor-paginated list:
 * `q` (free text over title/summary/tags), `category` and `tag` are all
 * optional filters layered on top of the same published-only, newest-first
 * query (docs/17_Feature_Roadmap.md Phase 5 — "search/filter across
 * projects").
 */
listProjectsRoute.get("/", zValidator("query", searchProjectsQuerySchema), async (c) => {
  const { limit, cursor, q, category, tag } = c.req.valid("query");

  try {
    const { projects: results, nextCursor } = await searchProjects(c.env.DB, {
      limit,
      cursor,
      q,
      category,
      tag,
      scope: { kind: "public" },
    });

    return c.json({
      data: results.map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        summary: p.summary,
        coverImageUrl: p.coverImageUrl,
        category: p.category,
        githubUrl: p.githubUrl,
        tags: p.tags,
        publishedAt: p.publishedAt,
      })),
      meta: { nextCursor },
    });
  } catch (err) {
    if (err instanceof InvalidCursorError) {
      return c.json({ error: { code: "INVALID_CURSOR", message: err.message } }, 400);
    }
    throw err;
  }
});
