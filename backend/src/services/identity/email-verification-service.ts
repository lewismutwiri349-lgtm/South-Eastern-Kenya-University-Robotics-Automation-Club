import { eq } from "drizzle-orm";
import { users, emailVerificationTokens } from "../../../../database/schema";
import { createDb } from "../../db/client";
import { hashToken } from "./tokens";
import type { Env } from "../../types/env";
import { recordIdentityAuditEvent } from "./audit-service";

export class InvalidVerificationTokenError extends Error {
  constructor() {
    super("This verification link is invalid");
    this.name = "InvalidVerificationTokenError";
  }
}

export class VerificationTokenExpiredError extends Error {
  constructor() {
    super("This verification link has expired");
    this.name = "VerificationTokenExpiredError";
  }
}

export async function verifyEmailToken(env: Env, rawToken: string): Promise<void> {
  const db = createDb(env);
  const tokenHash = await hashToken(rawToken);

  const [tokenRow] = await db
    .select()
    .from(emailVerificationTokens)
    .where(eq(emailVerificationTokens.tokenHash, tokenHash));

  if (!tokenRow) {
    throw new InvalidVerificationTokenError();
  }
  if (tokenRow.expiresAt.getTime() < Date.now()) {
    throw new VerificationTokenExpiredError();
  }

  const now = new Date();
  await db
    .update(users)
    .set({ emailVerifiedAt: now, updatedAt: now })
    .where(eq(users.id, tokenRow.userId));

  // Token is single-use — removed once consumed.
  await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.id, tokenRow.id));
  await recordIdentityAuditEvent(env, { action: "email_verified", actorUserId: tokenRow.userId });
}
