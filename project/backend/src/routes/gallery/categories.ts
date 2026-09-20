import { Hono } from "hono";
import { listPublishedGalleryCategories } from "../../services/gallery/gallery-service";
import type { Env } from "../../types/env";

/**
 * MOUNT ORDER MATTERS: this must be registered before the `/:slug` detail
 * route in `index.ts`, or Hono resolves `/api/gallery/categories` as a
 * gallery item whose slug happens to be "categories" and returns 404.
 */
export const listGalleryCategoriesRoute = new Hono<{ Bindings: Env }>();

listGalleryCategoriesRoute.get("/categories", async (c) => {
  const categories = await listPublishedGalleryCategories(c.env);
  return c.json({ data: categories });
});
