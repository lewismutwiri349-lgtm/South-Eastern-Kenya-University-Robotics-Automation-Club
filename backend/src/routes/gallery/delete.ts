import { Hono } from "hono";
import { deleteGalleryItem, GalleryItemNotFoundError } from "../../services/gallery/gallery-service";
import { requireAuth } from "../../middleware/require-auth";
import { requireRole } from "../../middleware/require-role";
import type { Env, AuthVariables } from "../../types/env";

export const deleteGalleryItemRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

const AUTHOR_ROLES = ["super_admin", "chairperson", "vice_chairperson", "secretary", "moderator"] as const;

deleteGalleryItemRoute.delete("/:id", requireAuth, requireRole(...AUTHOR_ROLES), async (c) => {
  const id = c.req.param("id");

  try {
    await deleteGalleryItem(c.env, id);
    return c.body(null, 204);
  } catch (err) {
    if (err instanceof GalleryItemNotFoundError) {
      return c.json({ error: { code: "NOT_FOUND", message: err.message } }, 404);
    }
    throw err;
  }
});
