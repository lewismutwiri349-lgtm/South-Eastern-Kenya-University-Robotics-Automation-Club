import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { addTeamMemberSchema, candidatesQuerySchema } from "../../schemas/project-management";
import { getProjectAccess, atLeast } from "../../services/projects/project-access";
import {
  listTeam,
  addTeamMember,
  updateTeamMemberRole,
  removeTeamMember,
  searchAddableMembers,
  TeamError,
} from "../../services/projects/project-team-service";
import { requireAuth } from "../../middleware/require-auth";
import type { Env, AuthVariables } from "../../types/env";

export const teamRoutes = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

async function requireProjectAccess(
  c: { env: Env; get: (k: "userId" | "role") => any },
  projectId: string,
  minLevel: "manager" | "contributor"
) {
  const access = await getProjectAccess(c.env.DB, projectId, { userId: c.get("userId"), role: c.get("role") });
  if (!access || !atLeast(access.level, minLevel)) return null;
  return access;
}

// GET /:id/team — anyone on the project (or a manager) can see who else is on it.
teamRoutes.get("/:id/team", requireAuth, async (c) => {
  const access = await requireProjectAccess(c, c.req.param("id"), "contributor");
  if (!access) return c.json({ error: { code: "NOT_FOUND", message: "Project not found" } }, 404);

  const team = await listTeam(c.env.DB, access.project.id);
  return c.json({
    data: team.map((m) => ({
      id: m.id,
      userId: m.user_id,
      firstName: m.first_name,
      lastName: m.last_name,
      role: m.role,
      joinedAt: m.joined_at,
    })),
  });
});

// GET /:id/team/candidates?q= — manager-only member search for the "add member" picker.
teamRoutes.get("/:id/team/candidates", requireAuth, zValidator("query", candidatesQuerySchema), async (c) => {
  const access = await requireProjectAccess(c, c.req.param("id"), "manager");
  if (!access) return c.json({ error: { code: "NOT_FOUND", message: "Project not found" } }, 404);

  const { q } = c.req.valid("query");
  const candidates = await searchAddableMembers(c.env.DB, access.project.id, q);
  return c.json({ data: candidates });
});

teamRoutes.post("/:id/team", requireAuth, zValidator("json", addTeamMemberSchema), async (c) => {
  const access = await requireProjectAccess(c, c.req.param("id"), "manager");
  if (!access) return c.json({ error: { code: "NOT_FOUND", message: "Project not found" } }, 404);

  const { userId, role } = c.req.valid("json");
  try {
    await addTeamMember(c.env.DB, access.project.id, userId, role);
    return c.json({ data: { added: true } }, 201);
  } catch (err) {
    if (err instanceof TeamError) {
      const status = err.code === "MEMBER_PROFILE_NOT_FOUND" ? 404 : 409;
      return c.json({ error: { code: err.code, message: err.message } }, status);
    }
    throw err;
  }
});

teamRoutes.patch("/:id/team/:memberProjectId", requireAuth, async (c) => {
  const access = await requireProjectAccess(c, c.req.param("id"), "manager");
  if (!access) return c.json({ error: { code: "NOT_FOUND", message: "Project not found" } }, 404);

  const body = await c.req.json<{ role?: "lead" | "contributor" }>().catch(() => ({}) as { role?: "lead" | "contributor" });
  if (body.role !== "lead" && body.role !== "contributor") {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "role must be 'lead' or 'contributor'" } }, 400);
  }

  try {
    await updateTeamMemberRole(c.env.DB, access.project.id, c.req.param("memberProjectId"), body.role);
    return c.json({ data: { updated: true } });
  } catch (err) {
    if (err instanceof TeamError) return c.json({ error: { code: err.code, message: err.message } }, 404);
    throw err;
  }
});

teamRoutes.delete("/:id/team/:memberProjectId", requireAuth, async (c) => {
  const access = await requireProjectAccess(c, c.req.param("id"), "manager");
  if (!access) return c.json({ error: { code: "NOT_FOUND", message: "Project not found" } }, 404);

  try {
    await removeTeamMember(c.env.DB, access.project.id, c.req.param("memberProjectId"));
    return c.body(null, 204);
  } catch (err) {
    if (err instanceof TeamError) return c.json({ error: { code: err.code, message: err.message } }, 404);
    throw err;
  }
});
