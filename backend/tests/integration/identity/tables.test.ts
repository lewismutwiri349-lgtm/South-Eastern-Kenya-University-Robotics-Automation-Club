import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import {
  users,
  sessions,
  emailVerificationTokens,
  passwordResetTokens,
  identityAuditLogs,
  identityRateLimits,
} from "../../../../database/schema";
import { createDb } from "../../../src/db/client";
import { env, resetIdentityTables, uniqueEmail } from "../../helpers/identity-fixtures";

/**
 * Per docs/10_Testing_Standards.md §2: "at least one integration test per
 * new database table's core CRUD path", exercised against a real (local,
 * migrated) D1 instance rather than a mock.
 */
describe("identity schema — table CRUD", () => {
  beforeEach(resetIdentityTables);

  it("users: insert, select, update, delete", async () => {
    const db = createDb(env);
    const id = crypto.randomUUID();
    const email = uniqueEmail();
    const now = new Date();

    await db.insert(users).values({
      id,
      email,
      passwordHash: "hash",
      firstName: "A",
      lastName: "B",
      role: "applicant",
      createdAt: now,
      updatedAt: now,
    });

    const [inserted] = await db.select().from(users).where(eq(users.id, id));
    expect(inserted.email).toBe(email);
    expect(inserted.failedLoginCount).toBe(0);
    expect(inserted.lockedUntil).toBeNull();

    await db.update(users).set({ role: "member" }).where(eq(users.id, id));
    const [updated] = await db.select().from(users).where(eq(users.id, id));
    expect(updated.role).toBe("member");

    await db.delete(users).where(eq(users.id, id));
    const remaining = await db.select().from(users).where(eq(users.id, id));
    expect(remaining).toHaveLength(0);
  });

  it("sessions: insert, select, update (lastUsedAt), delete", async () => {
    const db = createDb(env);
    const userId = crypto.randomUUID();
    const now = new Date();
    await db.insert(users).values({
      id: userId,
      email: uniqueEmail(),
      passwordHash: "hash",
      firstName: "A",
      lastName: "B",
      role: "applicant",
      createdAt: now,
      updatedAt: now,
    });

    const sessionId = crypto.randomUUID();
    await db.insert(sessions).values({
      id: sessionId,
      userId,
      tokenHash: "tokenhash",
      expiresAt: new Date(now.getTime() + 1000),
      createdAt: now,
      lastUsedAt: now,
    });

    const [inserted] = await db.select().from(sessions).where(eq(sessions.id, sessionId));
    expect(inserted.userId).toBe(userId);

    // SQLite integer timestamp columns store whole seconds, so compare at
    // second precision rather than exact milliseconds.
    const later = new Date(now.getTime() + 5000);
    await db.update(sessions).set({ lastUsedAt: later }).where(eq(sessions.id, sessionId));
    const [updated] = await db.select().from(sessions).where(eq(sessions.id, sessionId));
    expect(Math.floor(updated.lastUsedAt.getTime() / 1000)).toBe(Math.floor(later.getTime() / 1000));

    await db.delete(sessions).where(eq(sessions.id, sessionId));
    expect(await db.select().from(sessions).where(eq(sessions.id, sessionId))).toHaveLength(0);
  });

  it("email_verification_tokens: insert, select, delete (single-use consumption)", async () => {
    const db = createDb(env);
    const userId = crypto.randomUUID();
    const now = new Date();
    await db.insert(users).values({
      id: userId,
      email: uniqueEmail(),
      passwordHash: "hash",
      firstName: "A",
      lastName: "B",
      role: "applicant",
      createdAt: now,
      updatedAt: now,
    });

    const tokenId = crypto.randomUUID();
    await db.insert(emailVerificationTokens).values({
      id: tokenId,
      userId,
      tokenHash: "hash-of-token",
      expiresAt: new Date(now.getTime() + 60_000),
      createdAt: now,
    });

    const [inserted] = await db
      .select()
      .from(emailVerificationTokens)
      .where(eq(emailVerificationTokens.id, tokenId));
    expect(inserted.userId).toBe(userId);

    await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.id, tokenId));
    expect(
      await db.select().from(emailVerificationTokens).where(eq(emailVerificationTokens.id, tokenId))
    ).toHaveLength(0);
  });

  it("password_reset_tokens: insert, select, delete (single-use consumption)", async () => {
    const db = createDb(env);
    const userId = crypto.randomUUID();
    const now = new Date();
    await db.insert(users).values({
      id: userId,
      email: uniqueEmail(),
      passwordHash: "hash",
      firstName: "A",
      lastName: "B",
      role: "applicant",
      createdAt: now,
      updatedAt: now,
    });

    const tokenId = crypto.randomUUID();
    await db.insert(passwordResetTokens).values({
      id: tokenId,
      userId,
      tokenHash: "hash-of-token",
      expiresAt: new Date(now.getTime() + 60_000),
      createdAt: now,
    });

    expect(
      await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.id, tokenId))
    ).toHaveLength(1);

    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.id, tokenId));
    expect(
      await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.id, tokenId))
    ).toHaveLength(0);
  });

  it("identity_audit_logs: insert and select — append-only, application code never updates/deletes", async () => {
    const db = createDb(env);
    const logId = crypto.randomUUID();
    await db.insert(identityAuditLogs).values({
      id: logId,
      action: "login_succeeded",
      actorUserId: null,
      targetUserId: null,
      metadata: null,
      createdAt: new Date(),
    });

    const [inserted] = await db.select().from(identityAuditLogs).where(eq(identityAuditLogs.id, logId));
    expect(inserted.action).toBe("login_succeeded");
  });

  it("identity_rate_limits: insert, select, update (window increment)", async () => {
    const db = createDb(env);
    const entryId = crypto.randomUUID();
    const now = new Date();
    await db.insert(identityRateLimits).values({
      id: entryId,
      route: "/api/identity/login",
      identifierHash: "hash-of-ip",
      requestCount: 1,
      windowStartedAt: now,
    });

    const [inserted] = await db
      .select()
      .from(identityRateLimits)
      .where(eq(identityRateLimits.id, entryId));
    expect(inserted.requestCount).toBe(1);

    await db
      .update(identityRateLimits)
      .set({ requestCount: 2 })
      .where(eq(identityRateLimits.id, entryId));
    const [updated] = await db
      .select()
      .from(identityRateLimits)
      .where(eq(identityRateLimits.id, entryId));
    expect(updated.requestCount).toBe(2);
  });
});
