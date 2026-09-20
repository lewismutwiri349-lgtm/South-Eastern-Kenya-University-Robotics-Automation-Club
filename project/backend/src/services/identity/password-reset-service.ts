import { eq } from "drizzle-orm";
import { users, passwordResetTokens } from "../../../../database/schema";
import { createDb } from "../../db/client";
import { hashPassword } from "./password";
import { generateToken, hashToken } from "./tokens";
import { sendPasswordResetEmail } from "./email-service";
import { revokeAllSessionsForUser } from "./session-service";
import type { Env } from "../../types/env";
import { recordIdentityAuditEvent } from "./audit-service";
import { frontendUrl } from "../../lib/frontend-url";

const RESET_TOKEN_TTL_MS = 1000 * 60 * 60; // 1 hour — shorter than email
// verification since a password reset link is more sensitive if leaked.

export class InvalidResetTokenError extends Error {
  constructor() {
    super("This password reset link is invalid");
    this.name = "InvalidResetTokenError";
  }
}

export class ResetTokenExpiredError extends Error {
  constructor() {
    super("This password reset link has expired");
    this.name = "ResetTokenExpiredError";
  }
}

/**
 * Deliberately does not reveal whether the email exists — the caller
 * (route) always returns the same generic response either way, per
 * standard email-enumeration prevention.
 */
export async function requestPasswordReset(env: Env, email: string): Promise<void> {
  const db = createDb(env);
  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) return;

  const now = new Date();
  const rawToken = generateToken();
  const tokenHash = await hashToken(rawToken);
  const expiresAt = new Date(now.getTime() + RESET_TOKEN_TTL_MS);

  await db.insert(passwordResetTokens).values({
    id: crypto.randomUUID(),
    userId: user.id,
    tokenHash,
    expiresAt,
    createdAt: now,
  });

  // Same reasoning as registration-service.ts: email delivery is
  // best-effort, not a blocking dependency. The route already returns a
  // generic "if that email exists..." response regardless of outcome, so
  // this also has to not throw, or that guarantee breaks.
  try {
    const resetUrl = frontendUrl(env, `/reset-password?token=${rawToken}`);
    await sendPasswordResetEmail({
      apiKey: env.RESEND_API_KEY,
      from: env.EMAIL_FROM,
      to: user.email,
      firstName: user.firstName,
      resetUrl,
    });
  } catch (err) {
    console.error({
      level: "error",
      message: "Failed to send password reset email",
      userId: user.id,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function resetPassword(
  env: Env,
  rawToken: string,
  newPassword: string
): Promise<void> {
  const db = createDb(env);
  const tokenHash = await hashToken(rawToken);

  const [tokenRow] = await db
    .select()
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.tokenHash, tokenHash));

  if (!tokenRow) {
    throw new InvalidResetTokenError();
  }
  if (tokenRow.expiresAt.getTime() < Date.now()) {
    throw new ResetTokenExpiredError();
  }

  const newPasswordHash = await hashPassword(newPassword);
  const now = new Date();

  await db
    .update(users)
    .set({ passwordHash: newPasswordHash, updatedAt: now })
    .where(eq(users.id, tokenRow.userId));

  // Single-use token, consumed.
  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.id, tokenRow.id));

  // A stolen session shouldn't survive the legitimate owner reclaiming
  // their account via password reset.
  await revokeAllSessionsForUser(env, tokenRow.userId);
  await recordIdentityAuditEvent(env, { action: "password_reset", actorUserId: tokenRow.userId });
}
