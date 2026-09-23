import { generateId } from "../../src/lib/id-generator";
import { env, createTestUser, createTestSession, sessionCookieHeader } from "./identity-fixtures";

export { env, createTestUser, createTestSession, sessionCookieHeader };

/**
 * Migrations 0007-0010 (applications, member portal, project management —
 * tables Drizzle doesn't manage) are applied once, up front, via
 * `vitest.config.mts`'s `TEST_MIGRATIONS` binding, appended after the
 * journal-tracked ones. This export is kept as a no-op so existing call
 * sites (`beforeAll(applyProjectManagementMigrations)`) don't need to
 * change — calling `applyD1Migrations` a second time from within a test
 * crashes the pool-workers RPC bridge ("message too large") in this setup.
 */
export async function applyProjectManagementMigrations(): Promise<void> {
  // Intentionally empty — see comment above.
}

/**
 * Deletes all Phase 5 rows for a clean slate between tests. Doesn't touch
 * `projects` itself — callers create fresh projects per test via
 * `createTestProject`, same pattern as `resetContentTables`.
 */
export async function resetProjectManagementTables(): Promise<void> {
  const db = env.DB;
  await db.batch([
    db.prepare("DELETE FROM project_file_versions"),
    db.prepare("DELETE FROM project_files"),
    db.prepare("DELETE FROM project_tags"),
    db.prepare("DELETE FROM member_projects"),
    db.prepare("DELETE FROM member_profiles"),
    db.prepare("DELETE FROM projects"),
  ]);
}

/** Inserts a project row directly (bypassing the API) for tests that need one already in place. */
export async function createTestProject(overrides?: {
  ownerId?: string;
  status?: "draft" | "published" | "archived";
  title?: string;
  category?: string;
}): Promise<{ id: string; slug: string; ownerId: string }> {
  const db = env.DB;
  const id = generateId();
  const ownerId = overrides?.ownerId ?? (await createTestUser({ role: "secretary" })).id;
  const now = Math.floor(Date.now() / 1000);
  const slug = `test-project-${id.slice(0, 8)}`;
  const status = overrides?.status ?? "draft";

  await db
    .prepare(
      `INSERT INTO projects (id, title, slug, summary, body, owner_id, status, category, published_at, created_at, updated_at)
       VALUES (?, ?, ?, 'A test project', 'Body text', ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      overrides?.title ?? "Test Project",
      slug,
      ownerId,
      status,
      overrides?.category ?? null,
      status === "published" ? now : null,
      now,
      now
    )
    .run();

  return { id, slug, ownerId };
}

/** Creates a member_profiles row for a user (Phase 4 territory), for tests that need one without going through the members API. */
export async function createMemberProfile(userId: string): Promise<string> {
  const db = env.DB;
  const memberId = generateId();
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare(
      `INSERT INTO member_profiles (id, user_id, joined_at, years_in_club, created_at, updated_at)
       VALUES (?, ?, ?, 0, ?, ?)`
    )
    .bind(memberId, userId, now, now, now)
    .run();
  return memberId;
}

/** Creates a member profile for a user and assigns them to a project. */
export async function addProjectMember(
  projectId: string,
  userId: string,
  role: "lead" | "contributor" = "contributor"
): Promise<string> {
  const db = env.DB;
  const memberId = await createMemberProfile(userId);
  const memberProjectId = generateId();
  const now = Math.floor(Date.now() / 1000);

  await db
    .prepare(
      `INSERT INTO member_projects (id, member_id, project_id, role, joined_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(memberProjectId, memberId, projectId, role, now, now)
    .run();

  return memberProjectId;
}

/** A role that IS permitted to manage projects (create/edit/publish/team). */
export const PROJECT_MANAGER_ROLE = "secretary" as const;
/** A signed-in role with no special project permissions. */
export const UNPRIVILEGED_ROLE = "member" as const;

export async function managerCookie(): Promise<{ userId: string; cookie: string }> {
  const user = await createTestUser({ role: PROJECT_MANAGER_ROLE });
  return { userId: user.id, cookie: sessionCookieHeader(await createTestSession(user.id)) };
}

export async function memberCookie(): Promise<{ userId: string; cookie: string }> {
  const user = await createTestUser({ role: UNPRIVILEGED_ROLE });
  return { userId: user.id, cookie: sessionCookieHeader(await createTestSession(user.id)) };
}

/** A minimal valid PNG (1x1), for upload tests — real magic bytes, not a placeholder string. */
export const TINY_PNG_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00,
  0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00, 0x0c, 0x49,
  0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00, 0x00, 0x03, 0x01, 0x01, 0x00, 0x18, 0xdd, 0x8d, 0xb0,
  0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);
