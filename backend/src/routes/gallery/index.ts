import { Hono } from "hono";
import type { Env, AuthVariables } from "../../types/env";
import { listGalleryItemsRoute } from "./list";
import { listGalleryCategoriesRoute } from "./categories";
import { getGalleryItemRoute } from "./get";
import { createGalleryItemRoute } from "./create";
import { updateGalleryItemRoute } from "./update";
import { publishGalleryItemRoute } from "./publish";
import { deleteGalleryItemRoute } from "./delete";

export const galleryRoutes = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

galleryRoutes.route("/", listGalleryItemsRoute);
galleryRoutes.route("/", createGalleryItemRoute);
// Must come before the `/:slug` detail route below — otherwise
// `/api/gallery/categories` is matched as an item slug. See ./categories.ts.
galleryRoutes.route("/", listGalleryCategoriesRoute);
galleryRoutes.route("/", getGalleryItemRoute);
galleryRoutes.route("/", updateGalleryItemRoute);
galleryRoutes.route("/", publishGalleryItemRoute);
galleryRoutes.route("/", deleteGalleryItemRoute);
