import { Hono } from "hono";
import type { Env, AuthVariables } from "../../types/env";
import { listEventsRoute } from "./list";
import { getEventRoute } from "./get";
import { createEventRoute } from "./create";
import { updateEventRoute } from "./update";
import { publishEventRoute } from "./publish";
import { deleteEventRoute } from "./delete";

export const eventsRoutes = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

eventsRoutes.route("/", listEventsRoute);
eventsRoutes.route("/", createEventRoute);
eventsRoutes.route("/", getEventRoute);
eventsRoutes.route("/", updateEventRoute);
eventsRoutes.route("/", publishEventRoute);
eventsRoutes.route("/", deleteEventRoute);
