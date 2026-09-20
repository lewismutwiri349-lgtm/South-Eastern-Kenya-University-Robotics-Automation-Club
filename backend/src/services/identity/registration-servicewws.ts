import { eq } from "drizzle-orm";
import { users, emailVerificationTokens, DEFAULT_USER_ROLE } from "../../../../database/schema";
import { createDb } from "../../db/client";
import { hashPassword } from "./password";
import { generateToken, hashToken } from "./tokens";
import { sendVerificationEmail } from "./email-service";
import { recordIdentityAuditEvent } from "./audit-service";
import { frontendUrl } from "../../lib/frontend-url";
import type { Env } from "../../types/env";
import type { RegisterInput } from "../../schemas/identity";

const VERIFICATION_TOKEN_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

export class EmailAlreadyRegisteredError extends Error {
  constructor() {
    super("An account with this email already exists");
    this.name = "EmailAlreadyRegisteredError";
  }
}

export async function registerUser(
  env: Env,
  input: RegisterInput
): Promise<{ userId: string }> {
  const db = createDb(env);

  const existing = await db.select().from(users).where(eq(users.email, input.email));
  if (existing.length > 0) {
    throw new EmailAlreadyRegisteredError();
  }

  const now = new Date();
  const userId = crypto.randomUUID();
  const passwordHash = await hashPassword(input.password);

  await db.insert(users).values({
    id: userId,
    email: input.email,
    passwordHash,
    firstName: input.firstName,
    lastName: input.lastName,
    role: DEFAULT_USER_ROLE,
    createdAt: now,
    updatedAt: now,
  });

  await recordIdentityAuditEvent(env, { action: "account_registered", targetUserId: userId });

  await issueVerificationToken(env, userId, input.email, input.firstName, now);

  return { userId };
}

async function issueVerificationToken(
  env: Env,
  userId: string,
  email: string,
  firstName: string,
  now: Date
): Promise<void> {
  const db = createDb(env);
  const rawToken = generateToken();
  const tokenHash = await hashToken(rawToken);
  const expiresAt = new Date(now.getTime() + VERIFICATION_TOKEN_TTL_MS);

  await db.insert(emailVerificationTokens).values({
    id: crypto.randomUUID(),
    userId,
    tokenHash,
    expiresAt,
    createdAt: now,
  });

  // Deliberate design decision (found while validating end-to-end,
  // 2026-08-08): email delivery is a best-effort side effect, not a
  // blocking dependency of account creation. If Resend is down or
  // misconfigured, the account must still exist — the alternative (failing
  // registration because a third party is unreachable, while silently
  // leaving the row committed) was strictly worse: it returns 500 to a
  // user whose account was actually created. The verification token still
  // exists in the database even if the email never sent; the recovery path
  // is POST /api/identity/resend-verification (surfaced in the frontend on
  // the verify-email page and after a 403 at sign-in).
  try {
    // Built inside the try so a missing FRONTEND_URL is logged like any
    // other delivery failure instead of failing a registration that already
    // committed the account.
    const verificationUrl = frontendUrl(env, `/verify-email?token=${rawToken}`);
    await sendVerificationEmail({
      apiKey: env.RESEND_API_KEY,
      from: env.EMAIL_FROM,
      to: email,
      firstName,
      verificationUrl,
    });
  } catch (err) {
    console.error({
      level: "error",
      message: "Failed to send verification email; account was still created",
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
