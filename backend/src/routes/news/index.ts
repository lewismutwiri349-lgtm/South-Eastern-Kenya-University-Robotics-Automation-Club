import { Hono } from "hono";
import type { Env, AuthVariables } from "../../types/env";
import { listArticlesRoute } from "./list";
import { getArticleRoute } from "./get";
import { createArticleRoute } from "./create";
import { updateArticleRoute } from "./update";
import { publishArticleRoute } from "./publish";
import { deleteArticleRoute } from "./delete";

export const newsRoutes = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

newsRoutes.route("/", listArticlesRoute);
newsRoutes.route("/", createArticleRoute);
newsRoutes.route("/", getArticleRoute);
newsRoutes.route("/", updateArticleRoute);
newsRoutes.route("/", publishArticleRoute);
newsRoutes.route("/", deleteArticleRoute);
