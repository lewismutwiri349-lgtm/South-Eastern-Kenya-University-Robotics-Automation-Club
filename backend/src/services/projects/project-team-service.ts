import { generateId } from "../../lib/id-generator";

/**
 * Project team assignments (Phase 5), built on the `member_projects` table
 * that Phase 4 (migration 0009) already created for the membership card /
 * profile "projects I'm on" view. `role` here is "lead" | "contributor" —
 * a lead has manager-level access to the project (see project-access.ts).
 */

export type TeamMemberRow = {
  id: string;
  member_id: string;
  project_id: string;
  role: string | null;
  joined_at: number;
  user_id: string;
  first_name: string;
  last_name: string;
};

export class TeamError extends Error {
  constructor(
    message: string,
    readonly code: "MEMBER_PROFILE_NOT_FOUND" | "ALREADY_ON_TEAM" | "NOT_ON_TEAM"
  ) {
    super(message);
    this.name = "TeamError";
  }
}

export async function listTeam(db: D1Database, projectId: string): Promise<TeamMemberRow[]> {
  const { results } = await db
    .prepare(
      `SELECT mp.id, mp.member_id, mp.project_id, mp.role, mp.joined_at,
              u.id AS user_id, u.first_name, u.last_name
         FROM member_projects mp
         JOIN member_profiles prof ON prof.id = mp.member_id
         JOIN users u ON u.id = prof.user_id
        WHERE mp.project_id = ?
        ORDER BY mp.joined_at ASC`
    )
    .bind(projectId)
    .all<TeamMemberRow>();
  return results;
}

export async function addTeamMember(
  db: D1Database,
  projectId: string,
  userId: string,
  role: "lead" | "contributor"
): Promise<void> {
  const profile = await db
    .prepare("SELECT id FROM member_profiles WHERE user_id = ? LIMIT 1")
    .bind(userId)
    .first<{ id: string }>();
  if (!profile) throw new TeamError("That user has no member profile", "MEMBER_PROFILE_NOT_FOUND");

  const existing = await db
    .prepare("SELECT id FROM member_projects WHERE member_id = ? AND project_id = ? LIMIT 1")
    .bind(profile.id, projectId)
    .first<{ id: string }>();
  if (existing) throw new TeamError("That member is already on this project", "ALREADY_ON_TEAM");

  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare(
      `INSERT INTO member_projects (id, member_id, project_id, role, joined_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(generateId(), profile.id, projectId, role, now, now)
    .run();
}

export async function updateTeamMemberRole(
  db: D1Database,
  projectId: string,
  memberProjectId: string,
  role: "lead" | "contributor"
): Promise<void> {
  const result = await db
    .prepare("UPDATE member_projects SET role = ? WHERE id = ? AND project_id = ?")
    .bind(role, memberProjectId, projectId)
    .run();
  if (result.meta.changes === 0) throw new TeamError("Not on this project's team", "NOT_ON_TEAM");
}

export async function removeTeamMember(db: D1Database, projectId: string, memberProjectId: string): Promise<void> {
  const result = await db
    .prepare("DELETE FROM member_projects WHERE id = ? AND project_id = ?")
    .bind(memberProjectId, projectId)
    .run();
  if (result.meta.changes === 0) throw new TeamError("Not on this project's team", "NOT_ON_TEAM");
}

/** Members not already on the project, matching a name/email prefix — for the "add member" picker. */
export async function searchAddableMembers(
  db: D1Database,
  projectId: string,
  q: string
): Promise<{ userId: string; firstName: string; lastName: string; email: string }[]> {
  const like = `${q.toLowerCase()}%`;
  const { results } = await db
    .prepare(
      `SELECT u.id AS userId, u.first_name AS firstName, u.last_name AS lastName, u.email
         FROM users u
         JOIN member_profiles prof ON prof.user_id = u.id
        WHERE (LOWER(u.first_name) LIKE ? OR LOWER(u.last_name) LIKE ? OR LOWER(u.email) LIKE ?)
          AND NOT EXISTS (
                SELECT 1 FROM member_projects mp WHERE mp.member_id = prof.id AND mp.project_id = ?
              )
        ORDER BY u.first_name, u.last_name
        LIMIT 10`
    )
    .bind(like, like, like, projectId)
    .all<{ userId: string; firstName: string; lastName: string; email: string }>();
  return results;
}
