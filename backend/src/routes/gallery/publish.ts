import { Hono } from "hono";
import { publishGalleryItem, GalleryItemNotFoundError } from "../../services/gallery/gallery-service";
import { requireAuth } from "../../middleware/require-auth";
import { requireRole } from "../../middleware/require-role";
import type { Env, AuthVariables } from "../../types/env";

export const publishGalleryItemRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

const AUTHOR_ROLES = ["super_admin", "chairperson", "vice_chairperson", "secretary", "moderator"] as const;

publishGalleryItemRoute.post("/:id/publish", requireAuth, requireRole(...AUTHOR_ROLES), async (c) => {
  const id = c.req.param("id");

  try {
    await publishGalleryItem(c.env, id);
    return c.json({ data: { published: true } });
  } catch (err) {
    if (err instanceof GalleryItemNotFoundError) {
      return c.json({ error: { code: "NOT_FOUND", message: err.message } }, 404);
    }
    throw err;
  }
});
