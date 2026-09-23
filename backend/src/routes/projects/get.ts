import { Hono } from "hono";
import { getPublishedProjectBySlug } from "../../services/projects/projects-service";
import { getProjectTags } from "../../services/projects/project-search-service";
import type { Env } from "../../types/env";

export const getProjectRoute = new Hono<{ Bindings: Env }>();

getProjectRoute.get("/:slug", async (c) => {
  const slug = c.req.param("slug");
  const project = await getPublishedProjectBySlug(c.env, slug);

  if (!project) {
    return c.json({ error: { code: "NOT_FOUND", message: "Project not found" } }, 404);
  }

  const tags = await getProjectTags(c.env.DB, project.id);

  return c.json({
    data: {
      id: project.id,
      title: project.title,
      slug: project.slug,
      summary: project.summary,
      body: project.body,
      coverImageUrl: project.coverImageUrl,
      category: project.category,
      githubUrl: project.githubUrl,
      tags,
      publishedAt: project.publishedAt,
    },
  });
});
