import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { myProjectsQuerySchema } from "../../schemas/project-management";
import { searchProjects, InvalidCursorError } from "../../services/projects/project-search-service";
import { PROJECT_OVERSIGHT_ROLES } from "../../services/projects/project-access";
import { requireAuth } from "../../middleware/require-auth";
import type { Env, AuthVariables } from "../../types/env";

export const myProjectsRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

/**
 * "My projects" workspace list: projects the caller owns or is assigned to,
 * any status. `scope=all` additionally requires an oversight role and drops
 * the ownership/assignment filter entirely, for admin-style browsing.
 */
myProjectsRoute.get("/mine", requireAuth, zValidator("query", myProjectsQuerySchema), async (c) => {
  const { limit, cursor, q, category, tag, status, scope } = c.req.valid("query");
  const role = c.get("role");
  const userId = c.get("userId");

  if (scope === "all" && !PROJECT_OVERSIGHT_ROLES.includes(role)) {
    return c.json({ error: { code: "FORBIDDEN", message: "You do not have permission to view all projects" } }, 403);
  }

  try {
    const { projects: results, nextCursor } = await searchProjects(c.env.DB, {
      limit,
      cursor,
      q,
      category,
      tag,
      scope: scope === "all" ? { kind: "all", status } : { kind: "mine", userId, status },
    });

    return c.json({ data: results, meta: { nextCursor } });
  } catch (err) {
    if (err instanceof InvalidCursorError) {
      return c.json({ error: { code: "INVALID_CURSOR", message: err.message } }, 400);
    }
    throw err;
  }
});
