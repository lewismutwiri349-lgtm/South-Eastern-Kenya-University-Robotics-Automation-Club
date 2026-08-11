import { eq } from "drizzle-orm";
import { sessions, users } from "../../../../database/schema";
import { createDb } from "../../db/client";
import { generateToken, hashToken } from "./tokens";
import type { Env } from "../../types/env";
import type { UserRole } from "../../../../database/schema";

export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export async function createSession(
  env: Env,
  userId: string
): Promise<{ rawToken: string; expiresAt: Date }> {
  const db = createDb(env);
  const now = new Date();
  const rawToken = generateToken();
  const tokenHash = await hashToken(rawToken);
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);

  await db.insert(sessions).values({
    id: crypto.randomUUID(),
    userId,
    tokenHash,
    expiresAt,
    createdAt: now,
    lastUsedAt: now,
  });

  return { rawToken, expiresAt };
}

/**
 * Looks up a session by its raw cookie token, joined with the user's
 * current role in a single query — avoids a second round trip for every
 * protected route that also needs role information for requireRole.
 * Returns null (rather than throwing) for any invalid/expired case —
 * callers treat "no valid session" uniformly regardless of the specific
 * reason, which avoids leaking which failure mode occurred.
 */
export async function getValidSession(
  env: Env,
  rawToken: string
): Promise<{ userId: string; role: UserRole } | null> {
  const db = createDb(env);
  const tokenHash = await hashToken(rawToken);

  const rows = await db
    .select({
      sessionId: sessions.id,
      userId: sessions.userId,
      expiresAt: sessions.expiresAt,
      role: users.role,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.tokenHash, tokenHash));

  const session = rows[0];
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await db.delete(sessions).where(eq(sessions.id, session.sessionId));
    return null;
  }

  await db
    .update(sessions)
    .set({ lastUsedAt: new Date() })
    .where(eq(sessions.id, session.sessionId));

  return { userId: session.userId, role: session.role as UserRole };
}

export async function revokeSession(env: Env, rawToken: string): Promise<void> {
  const db = createDb(env);
  const tokenHash = await hashToken(rawToken);
  await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
}

/**
 * Revokes every session belonging to a user. Used by password reset so a
 * stolen session token can't survive the owner changing their password —
 * matches docs/08_Security_Standards.md's privilege/session integrity
 * intent. Not built in the login slice (2b) because nothing needed it yet;
 * built now because this is the first real caller.
 */
export async function revokeAllSessionsForUser(env: Env, userId: string): Promise<void> {
  const db = createDb(env);
  await db.delete(sessions).where(eq(sessions.userId, userId));
}
