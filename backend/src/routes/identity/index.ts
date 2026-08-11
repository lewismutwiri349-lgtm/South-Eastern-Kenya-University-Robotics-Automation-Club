import { Hono } from "hono";
import type { Env, AuthVariables } from "../../types/env";
import { registerRoute } from "./register";
import { verifyEmailRoute } from "./verify-email";
import { loginRoute } from "./login";
import { logoutRoute } from "./logout";
import { meRoute } from "./me";
import { requestPasswordResetRoute } from "./request-password-reset";
import { resetPasswordRoute } from "./reset-password";
import { listUsersRoute } from "./list-users";

export const identityRoutes = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

identityRoutes.route("/register", registerRoute);
identityRoutes.route("/verify-email", verifyEmailRoute);
identityRoutes.route("/login", loginRoute);
identityRoutes.route("/logout", logoutRoute);
identityRoutes.route("/me", meRoute);
identityRoutes.route("/request-password-reset", requestPasswordResetRoute);
identityRoutes.route("/reset-password", resetPasswordRoute);
identityRoutes.route("/users", listUsersRoute);
