import { eq } from "drizzle-orm";
import { users, emailVerificationTokens, DEFAULT_USER_ROLE } from "../../../../database/schema";
import { createDb } from "../../db/client";
import { hashPassword } from "./password";
import { generateToken, hashToken } from "./tokens";
import { sendVerificationEmail } from "./email-service";
import { recordIdentityAuditEvent } from "./audit-service";
import type { Env } from "../../types/env";
import type { RegisterInput } from "../../schemas/identity";

const VERIFICATION_TOKEN_TTL_MS = 1000 * 60 * 60 * 24;

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

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, input.email));

  if (existing.length > 0) {
    throw new EmailAlreadyRegisteredError();
  }

  const now = new Date();
  const userId = crypto.randomUUID();
  const passwordHash = await hashPassword(input.password);

  // Account creation is the critical operation.
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

  // Audit logging must never make registration fail.
  try {
    await recordIdentityAuditEvent(env, {
      action: "account_registered",
      targetUserId: userId,
    });
  } catch (err) {
    console.error({
      level: "error",
      message: "Failed to record registration audit event",
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Verification email/token is a best-effort side effect.
  try {
    await issueVerificationToken(
      env,
      userId,
      input.email,
      input.firstName,
      now
    );
  } catch (err) {
    console.error({
      level: "error",
      message: "Failed to create/send verification token; account was still created",
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

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

  const verificationUrl =
    `${env.FRONTEND_URL}/verify-email?token=${rawToken}`;

  try {
    await sendVerificationEmail({
      apiKey: env.RESEND_API_KEY,
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
