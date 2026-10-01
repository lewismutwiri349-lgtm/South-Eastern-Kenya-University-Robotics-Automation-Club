import { and, desc, eq, like, lt, or } from "drizzle-orm";
import { users, type UserRole } from "../../../../database/schema";
import { createDb } from "../../db/client";
import { recordAdminAuditEvent } from "./audit-service";
import type { Env } from "../../types/env";

export class UserNotFoundError extends Error {
  constructor() {
    super("User not found");
    this.name = "UserNotFoundError";
  }
}

/** An actor changing their own role, which this domain never allows. */
export class SelfRoleChangeError extends Error {
  constructor() {
    super("You cannot change your own role");
    this.name = "SelfRoleChangeError";
  }
}

export type AdminUserListItem = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  emailVerifiedAt: Date | null;
  createdAt: Date;
};

/**
 * Cursor-based pagination per docs/05_API_Standards.md §4 — ordered by
 * (createdAt, id) descending, newest first. Same shape as
 * `listContactMessages`; duplicated rather than shared since there is no
 * existing cross-domain pagination utility in the codebase yet.
 */
export async function listUsers(
  env: Env,
  { limit, cursor, role, q }: { limit: number; cursor?: string; role?: UserRole; q?: string }
): Promise<{ users: AdminUserListItem[]; nextCursor: string | null }> {
  const db = createDb(env);

  const filters = [];
  if (role) filters.push(eq(users.role, role));
  if (q) {
    const term = `%${q}%`;
    filters.push(or(like(users.firstName, term), like(users.lastName, term), like(users.email, term)));
  }

  const cursorCondition = cursor ? decodeCursor(cursor) : null;
  if (cursorCondition) {
    const pageCondition = or(
      lt(users.createdAt, cursorCondition.createdAt),
      and(eq(users.createdAt, cursorCondition.createdAt), lt(users.id, cursorCondition.id))
    );
    if (pageCondition) filters.push(pageCondition);
  }

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      emailVerifiedAt: users.emailVerifiedAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(users.createdAt), desc(users.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];
  const nextCursor = hasMore && last ? encodeCursor(last.createdAt, last.id) : null;

  return { users: page as AdminUserListItem[], nextCursor };
}

/**
 * Grants a new role to a user. Privilege-escalation guards per
 * docs/08_Security_Standards.md §2: the caller can never target themselves
 * (`actorUserId`/`targetUserId` are compared by the route, not here, so the
 * guard is enforced against the authenticated session, not a client-
 * supplied field), and every change is written to the immutable admin audit
 * log with actor, target, before/after role.
 */
export async function changeUserRole(
  env: Env,
  { actorUserId, targetUserId, newRole }: { actorUserId: string; targetUserId: string; newRole: UserRole }
): Promise<AdminUserListItem> {
  if (actorUserId === targetUserId) throw new SelfRoleChangeError();

  const db = createDb(env);
  const [existing] = await db.select().from(users).where(eq(users.id, targetUserId));
  if (!existing) throw new UserNotFoundError();

  if (existing.role === newRole) {
    // Idempotent no-op: nothing changed, so nothing to audit.
    return toListItem(existing);
  }

  const [updated] = await db
    .update(users)
    .set({ role: newRole, updatedAt: new Date() })
    .where(eq(users.id, targetUserId))
    .returning();

  await recordAdminAuditEvent(env, {
    action: "user_role_changed",
    actorUserId,
    targetUserId,
    metadata: { previousRole: existing.role, newRole },
  });

  return toListItem(updated);
}

function toListItem(row: typeof users.$inferSelect): AdminUserListItem {
  return {
    id: row.id,
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    role: row.role as UserRole,
    emailVerifiedAt: row.emailVerifiedAt,
    createdAt: row.createdAt,
  };
}

function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(JSON.stringify({ createdAt: createdAt.getTime(), id })).toString("base64url");
}

function decodeCursor(cursor: string): { createdAt: Date; id: string } {
  const decoded = JSON.parse(Buffer.from(cursor, "base64url").toString("utf-8"));
  return { createdAt: new Date(decoded.createdAt), id: decoded.id };
}
