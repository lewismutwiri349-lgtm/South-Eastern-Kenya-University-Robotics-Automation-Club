import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createGalleryItemSchema } from "../../schemas/gallery";
import { createGalleryItem } from "../../services/gallery/gallery-service";
import { requireAuth } from "../../middleware/require-auth";
import { requireRole } from "../../middleware/require-role";
import type { Env, AuthVariables } from "../../types/env";

export const createGalleryItemRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

const AUTHOR_ROLES = ["super_admin", "chairperson", "vice_chairperson", "secretary", "moderator"] as const;

createGalleryItemRoute.post(
  "/",
  requireAuth,
  requireRole(...AUTHOR_ROLES),
  zValidator("json", createGalleryItemSchema),
  async (c) => {
    const input = c.req.valid("json");
    const authorId = c.get("userId");
    const result = await createGalleryItem(c.env, authorId, input);
    return c.json({ data: result }, 201);
  }
);
