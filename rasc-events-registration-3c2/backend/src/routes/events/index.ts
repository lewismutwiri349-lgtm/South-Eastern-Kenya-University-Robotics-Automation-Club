import { Hono } from "hono";
import type { Env, AuthVariables } from "../../types/env";
import { listEventsRoute } from "./list";
import { getEventRoute } from "./get";
import { createEventRoute } from "./create";
import { updateEventRoute } from "./update";
import { publishEventRoute } from "./publish";
import { deleteEventRoute } from "./delete";
import { registerForEventRoute } from "./register";
import { cancelRegistrationRoute } from "./cancel-registration";
import { myRegistrationRoute } from "./my-registration";
import { listRegistrationsRoute } from "./list-registrations";

export const eventsRoutes = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

eventsRoutes.route("/", listEventsRoute);
eventsRoutes.route("/", createEventRoute);
// Registration routes mounted before getEventRoute: getEventRoute matches
// GET "/:slug" against *any* single path segment, which would otherwise
// shadow more specific paths if Hono fell back to first-match-wins across
// routers. Hono actually matches most-specific internally regardless of
// mount order, but keeping literal-suffix routes ahead of the catch-all
// param route here is the same defensive ordering used project-wide.
eventsRoutes.route("/", registerForEventRoute);
eventsRoutes.route("/", cancelRegistrationRoute);
eventsRoutes.route("/", myRegistrationRoute);
eventsRoutes.route("/", listRegistrationsRoute);
eventsRoutes.route("/", getEventRoute);
eventsRoutes.route("/", updateEventRoute);
eventsRoutes.route("/", publishEventRoute);
eventsRoutes.route("/", deleteEventRoute);
