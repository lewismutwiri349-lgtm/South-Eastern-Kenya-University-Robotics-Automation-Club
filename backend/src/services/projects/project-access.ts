import type { UserRole } from "../../../../database/schema";

/**
 * Who can do what inside a project workspace (Phase 5).
 *
 *  - manager      : management roles, the project's owner, or a team `lead`.
 *                   May edit files, change visibility, delete, manage the team.
 *  - contributor  : anyone assigned to the project. May view every file and
 *                   upload files / new versions.
 *  - public       : everyone else, only when the project is published, and
 *                   only for files marked `public`.
 *
 * A project the caller has no access to is reported as not found rather than
 * forbidden, so draft project ids can't be probed.
 */
export const PROJECT_MANAGER_ROLES: readonly UserRole[] = [
  "super_admin",
  "chairperson",
  "vice_chairperson",
  "secretary",
  "moderator",
  "project_leader",
  "division_head",
];

/** Roles that may see every project (any status) via `scope=all`. */
export const PROJECT_OVERSIGHT_ROLES: readonly UserRole[] = [
  "super_admin",
  "chairperson",
  "vice_chairperson",
  "secretary",
  "moderator",
];

export type AccessLevel = "manager" | "contributor" | "public";
export type Viewer = { userId: string; role: UserRole } | null;

export type ProjectRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
  owner_id: string;
};

export type ProjectAccess = { project: ProjectRow; level: AccessLevel };

const LEVEL_RANK: Record<AccessLevel, number> = { public: 0, contributor: 1, manager: 2 };

export function atLeast(level: AccessLevel, required: AccessLevel): boolean {
  return LEVEL_RANK[level] >= LEVEL_RANK[required];
}

export async function getProjectAccess(
  db: D1Database,
  projectId: string,
  viewer: Viewer
): Promise<ProjectAccess | null> {
  const project = await db
    .prepare(
      "SELECT id, title, slug, status, owner_id FROM projects WHERE id = ? AND deleted_at IS NULL LIMIT 1"
    )
    .bind(projectId)
    .first<ProjectRow>();
  if (!project) return null;

  const published = project.status === "published";
  if (!viewer) return published ? { project, level: "public" } : null;

  if (PROJECT_MANAGER_ROLES.includes(viewer.role) || project.owner_id === viewer.userId) {
    return { project, level: "manager" };
  }

  const membership = await db
    .prepare(
      `SELECT mp.role AS role
         FROM member_projects mp
         JOIN member_profiles mprof ON mprof.id = mp.member_id
        WHERE mprof.user_id = ? AND mp.project_id = ?
        LIMIT 1`
    )
    .bind(viewer.userId, projectId)
    .first<{ role: string | null }>();

  if (membership) return { project, level: membership.role === "lead" ? "manager" : "contributor" };
  return published ? { project, level: "public" } : null;
}
