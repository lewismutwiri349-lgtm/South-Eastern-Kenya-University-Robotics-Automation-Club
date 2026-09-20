import { Hono } from "hono";
import { listPublishedResourceCategories } from "../../services/resources/resources-service";
import type { Env } from "../../types/env";

/**
 * MOUNT ORDER MATTERS: must be registered before the `/:slug` detail route
 * in `index.ts`, or `/api/resources/categories` resolves as a resource slug.
 */
export const listResourceCategoriesRoute = new Hono<{ Bindings: Env }>();

listResourceCategoriesRoute.get("/categories", async (c) => {
  const categories = await listPublishedResourceCategories(c.env);
  return c.json({ data: categories });
});
