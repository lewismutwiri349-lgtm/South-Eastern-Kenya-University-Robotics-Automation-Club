import { eq } from "drizzle-orm";
import { users, emailVerificationTokens } from "../../../../database/schema";
import { createDb } from "../../db/client";
import { generateToken, hashToken } from "./tokens";
import type { Env } from "../../types/env";
import { recordIdentityAuditEvent } from "./audit-service";
import { sendVerificationEmail } from "./email-service";
import { frontendUrl } from "../../lib/frontend-url";

const VERIFICATION_TOKEN_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

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

// EXISTING FUNCTION — preserved so the current verification flow
// continues to work exactly as before.
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
  await db
    .delete(emailVerificationTokens)
    .where(eq(emailVerificationTokens.id, tokenRow.id));

  await recordIdentityAuditEvent(env, {
    action: "email_verified",
    actorUserId: tokenRow.userId,
  });
}

// NEW FUNCTION — sends a fresh verification email
// without creating another account.
export async function resendVerificationEmail(
  env: Env,
  email: string
): Promise<void> {
  const db = createDb(env);

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email));

  // Do not reveal whether an account exists.
  if (!user) {
    return;
  }

  // Do not send verification emails to an already-verified account.
  if (user.emailVerifiedAt) {
    return;
  }

  const now = new Date();
  const rawToken = generateToken();
  const tokenHash = await hashToken(rawToken);
  const expiresAt = new Date(now.getTime() + VERIFICATION_TOKEN_TTL_MS);

  // Remove old tokens so only the newest verification link remains valid.
  await db
    .delete(emailVerificationTokens)
    .where(eq(emailVerificationTokens.userId, user.id));

  await db.insert(emailVerificationTokens).values({
    id: crypto.randomUUID(),
    userId: user.id,
    tokenHash,
    expiresAt,
    createdAt: now,
  });

  try {
    const verificationUrl = frontendUrl(env, `/verify-email?token=${rawToken}`);
    await sendVerificationEmail({
      apiKey: env.RESEND_API_KEY,
      from: env.EMAIL_FROM,
      to: user.email,
      firstName: user.firstName,
      verificationUrl,
    });
  } catch (err) {
    console.error({
      level: "error",
      message: "Failed to resend verification email",
      userId: user.id,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}