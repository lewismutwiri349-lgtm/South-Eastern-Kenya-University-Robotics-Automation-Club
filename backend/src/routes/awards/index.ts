import { Hono } from "hono";
import type { Env, AuthVariables } from "../../types/env";
import { listAwardsRoute } from "./list";
import { getAwardRoute } from "./get";
import { createAwardRoute } from "./create";
import { updateAwardRoute } from "./update";
import { publishAwardRoute } from "./publish";
import { deleteAwardRoute } from "./delete";

export const awardsRoutes = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

awardsRoutes.route("/", listAwardsRoute);
awardsRoutes.route("/", createAwardRoute);
awardsRoutes.route("/", getAwardRoute);
awardsRoutes.route("/", updateAwardRoute);
awardsRoutes.route("/", publishAwardRoute);
awardsRoutes.route("/", deleteAwardRoute);
