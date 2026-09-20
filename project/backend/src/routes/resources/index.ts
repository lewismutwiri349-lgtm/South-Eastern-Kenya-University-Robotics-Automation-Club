import { Hono } from "hono";
import type { Env, AuthVariables } from "../../types/env";
import { listResourcesRoute } from "./list";
import { listResourceCategoriesRoute } from "./categories";
import { getResourceRoute } from "./get";
import { createResourceRoute } from "./create";
import { updateResourceRoute } from "./update";
import { publishResourceRoute } from "./publish";
import { deleteResourceRoute } from "./delete";

export const resourcesRoutes = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

resourcesRoutes.route("/", listResourcesRoute);
resourcesRoutes.route("/", createResourceRoute);
// Must come before the `/:slug` detail route below. See ./categories.ts.
resourcesRoutes.route("/", listResourceCategoriesRoute);
resourcesRoutes.route("/", getResourceRoute);
resourcesRoutes.route("/", updateResourceRoute);
resourcesRoutes.route("/", publishResourceRoute);
resourcesRoutes.route("/", deleteResourceRoute);
