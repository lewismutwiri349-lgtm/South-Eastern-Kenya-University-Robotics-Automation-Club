import { Hono } from "hono";
import { submitApplicationRoute } from "./submit";
import { getApplicationRoute } from "./get";
import { startTestRoute } from "./start-test";
import { submitTestRoute } from "./submit-test";
import { getTestResultRoute } from "./get-test-result";
import { listInterviewSlotsRoute } from "./list-interview-slots";
import { scheduleInterviewRoute } from "./schedule-interview";
import { getInterviewsRoute } from "./get-interviews";
import type { Env, AuthVariables } from "../../types/env";

export const applicationsRouter = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// Application endpoints
applicationsRouter.route("/", submitApplicationRoute);
applicationsRouter.route("/", getApplicationRoute);

// Aptitude test endpoints
applicationsRouter.route("/", startTestRoute);
applicationsRouter.route("/", submitTestRoute);
applicationsRouter.route("/", getTestResultRoute);

// Interview endpoints
applicationsRouter.route("/", listInterviewSlotsRoute);
applicationsRouter.route("/", scheduleInterviewRoute);
applicationsRouter.route("/", getInterviewsRoute);
