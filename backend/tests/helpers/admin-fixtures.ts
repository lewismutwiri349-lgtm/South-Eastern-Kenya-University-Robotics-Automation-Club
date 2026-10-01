import { adminAuditLogs, applications, type ApplicationStatus } from "../../../database/schema";
import { createDb } from "../../src/db/client";
import { env, createTestUser, createTestSession, sessionCookieHeader } from "./identity-fixtures";

export { env, createTestUser, createTestSession, sessionCookieHeader };

/**
 * Roles allowed to see the roster/applicant lists, per
 * docs/07_User_Roles.md's Administration Domain section.
 */
export const ADMIN_STAFF_ROLE = "secretary" as const;

/** Only these two can grant roles — narrower than `ADMIN_STAFF_ROLE`. */
export const ROLE_GRANTER_ROLE = "chairperson" as const;

/** Authenticated but not an admin-staff role, for the 403 leg of tests. */
export const UNPRIVILEGED_ROLE = "member" as const;

export async function staffCookie(): Promise<string> {
  const user = await createTestUser({ role: ADMIN_STAFF_ROLE });
  return sessionCookieHeader(await createTestSession(user.id));
}

export async function roleGranterCookie(): Promise<{ id: string; cookie: string }> {
  const user = await createTestUser({ role: ROLE_GRANTER_ROLE });
  return { id: user.id, cookie: sessionCookieHeader(await createTestSession(user.id)) };
}

export async function unprivilegedCookie(): Promise<string> {
  const user = await createTestUser({ role: UNPRIVILEGED_ROLE });
  return sessionCookieHeader(await createTestSession(user.id));
}

/**
 * Inserts an application row directly (bypassing the Applicant Portal
 * submission flow), for admin-side tests that need an existing application
 * in a specific status.
 */
export async function createTestApplication(overrides: {
  userId: string;
  status: ApplicationStatus;
  divisionPreferencePrimary?: string | null;
}): Promise<typeof applications.$inferSelect> {
  const db = createDb(env);
  const id = crypto.randomUUID();
  const now = new Date();

  const [row] = await db
    .insert(applications)
    .values({
      id,
      userId: overrides.userId,
      status: overrides.status,
      firstName: "Test",
      lastName: "Applicant",
      email: `applicant-${id}@example.com`,
      divisionPreferencePrimary: overrides.divisionPreferencePrimary ?? null,
      submittedAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return row;
}

/**
 * `member_profiles` has no Drizzle schema definition yet (see
 * docs/modules/admin-dashboard.md's note — a pre-existing gap in the
 * Members domain, not introduced here), so this reads it the same way
 * `member-service.ts` writes it: raw D1.
 */
export async function getMemberProfileByUserId(userId: string): Promise<{ division: string | null } | null> {
  const row = await env.DB.prepare("SELECT division FROM member_profiles WHERE user_id = ?")
    .bind(userId)
    .first<{ division: string | null }>();
  return row ?? null;
}

export async function resetAdminTables(): Promise<void> {
  const db = createDb(env);
  await db.delete(adminAuditLogs);
  await env.DB.prepare("DELETE FROM member_profiles").run();
  await db.delete(applications);
}
