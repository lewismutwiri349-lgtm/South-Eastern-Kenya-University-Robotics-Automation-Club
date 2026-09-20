import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { updateGalleryItemSchema } from "../../schemas/gallery";
import { updateGalleryItem, GalleryItemNotFoundError } from "../../services/gallery/gallery-service";
import { requireAuth } from "../../middleware/require-auth";
import { requireRole } from "../../middleware/require-role";
import type { Env, AuthVariables } from "../../types/env";

export const updateGalleryItemRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

const AUTHOR_ROLES = ["super_admin", "chairperson", "vice_chairperson", "secretary", "moderator"] as const;

updateGalleryItemRoute.patch(
  "/:id",
  requireAuth,
  requireRole(...AUTHOR_ROLES),
  zValidator("json", updateGalleryItemSchema),
  async (c) => {
    const id = c.req.param("id");
    const input = c.req.valid("json");

    try {
      await updateGalleryItem(c.env, id, input);
      return c.json({ data: { updated: true } });
    } catch (err) {
      if (err instanceof GalleryItemNotFoundError) {
        return c.json({ error: { code: "NOT_FOUND", message: err.message } }, 404);
      }
      throw err;
    }
  }
);
