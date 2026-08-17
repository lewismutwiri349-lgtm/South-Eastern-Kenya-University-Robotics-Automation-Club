import { Hono } from "hono";
import type { Env, AuthVariables } from "../../types/env";
import { listProjectsRoute } from "./list";
import { getProjectRoute } from "./get";
import { createProjectRoute } from "./create";
import { updateProjectRoute } from "./update";
import { publishProjectRoute } from "./publish";
import { deleteProjectRoute } from "./delete";

export const projectsRoutes = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

projectsRoutes.route("/", listProjectsRoute);
projectsRoutes.route("/", createProjectRoute);
projectsRoutes.route("/", getProjectRoute);
projectsRoutes.route("/", updateProjectRoute);
projectsRoutes.route("/", publishProjectRoute);
projectsRoutes.route("/", deleteProjectRoute);
