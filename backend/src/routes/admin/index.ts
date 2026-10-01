import { Hono } from "hono";
import { listAdminUsersRoute } from "./list-users";
import { changeUserRoleRoute } from "./change-user-role";
import { listAdminApplicationsRoute } from "./list-applications";
import { getAdminApplicationRoute } from "./get-application";
import { acceptApplicationRoute } from "./accept-application";
import { rejectApplicationRoute } from "./reject-application";
import type { Env, AuthVariables } from "../../types/env";

export const adminRouter = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// User management endpoints
adminRouter.route("/users", listAdminUsersRoute);
adminRouter.route("/users", changeUserRoleRoute);

// Applicant management endpoints
adminRouter.route("/applications", listAdminApplicationsRoute);
adminRouter.route("/applications", getAdminApplicationRoute);
adminRouter.route("/applications", acceptApplicationRoute);
adminRouter.route("/applications", rejectApplicationRoute);
