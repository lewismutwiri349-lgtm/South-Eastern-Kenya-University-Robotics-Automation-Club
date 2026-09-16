import { Hono } from "hono";
import type { Env, AuthVariables } from "../../types/env";
import { submitContactMessageRoute } from "./submit";
import { listContactMessagesRoute } from "./list";
import { handleContactMessageRoute } from "./handle";
import { deleteContactMessageRoute } from "./delete";

/**
 * The only domain where the public writes and staff read, rather than the
 * reverse. There is deliberately no public GET of any kind here — see
 * database/schema/contact.ts.
 */
export const contactRoutes = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

contactRoutes.route("/", submitContactMessageRoute);
contactRoutes.route("/", listContactMessagesRoute);
contactRoutes.route("/", handleContactMessageRoute);
contactRoutes.route("/", deleteContactMessageRoute);
