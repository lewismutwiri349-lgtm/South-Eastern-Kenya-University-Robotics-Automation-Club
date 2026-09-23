import { Hono } from "hono";
import { getFacets } from "../../services/projects/project-search-service";
import type { Env } from "../../types/env";

export const facetsRoute = new Hono<{ Bindings: Env }>();

/** Category/tag counts across published projects, for the filter UI. */
facetsRoute.get("/facets", async (c) => {
  const facets = await getFacets(c.env.DB);
  return c.json({ data: facets });
});
