import { Hono } from "hono";
import type { Env, AuthVariables } from "../../types/env";
import { listProjectsRoute } from "./list";
import { facetsRoute } from "./facets";
import { myProjectsRoute } from "./my";
import { getProjectRoute } from "./get";
import { createProjectRoute } from "./create";
import { updateProjectRoute } from "./update";
import { publishProjectRoute } from "./publish";
import { deleteProjectRoute } from "./delete";
import { filesRoutes } from "./files";
import { teamRoutes } from "./team";

export const projectsRoutes = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// Order matters: literal-segment routes (/facets, /mine) must be mounted
// before /:slug in getProjectRoute, or Hono would match "facets"/"mine" as
// a slug and never reach these handlers.
projectsRoutes.route("/", facetsRoute);
projectsRoutes.route("/", myProjectsRoute);
projectsRoutes.route("/", listProjectsRoute);
projectsRoutes.route("/", createProjectRoute);
projectsRoutes.route("/", filesRoutes);
projectsRoutes.route("/", teamRoutes);
projectsRoutes.route("/", getProjectRoute);
projectsRoutes.route("/", updateProjectRoute);
projectsRoutes.route("/", publishProjectRoute);
projectsRoutes.route("/", deleteProjectRoute);
